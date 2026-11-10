import { AppTask } from '../types';
import { isCapacitorNative } from '../utils/platform';
import {
  getDayOfWeek,
  gregorianToJalali,
  jalaliToGregorian,
  normalizeJalaliDateStr,
  parseJalaliString,
  toLatinDigits,
} from '../calendar/jalali';

/**
 * Background alarms for the Android app: tasks get a notification at their start time,
 * (optionally earlier via "reminder before") and at their deadline time, even when the app is closed.
 * Everything is re-scheduled from scratch whenever tasks change (idempotent).
 */

const HORIZON_DAYS = 14;
const MAX_NOTIFICATIONS = 60;

type Kind = 'REMIND' | 'START' | 'END';

function parseHM(s?: string | null): { h: number; m: number } | null {
  if (!s) return null;
  const parts = toLatinDigits(s.trim()).split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function ymdKey(y: number, m: number, d: number) {
  return y * 10000 + m * 100 + d;
}

function dueKey(str?: string | null): number | null {
  const j = parseJalaliString(normalizeJalaliDateStr(toLatinDigits(str || '')));
  return j ? ymdKey(j.year, j.month, j.day) : null;
}

export function taskOccursOn(task: AppTask, y: number, m: number, d: number, dow: number): boolean {
  const key = ymdKey(y, m, d);
  const due = dueKey(task.dueDate);
  const start = dueKey(task.startDate);
  if (task.repeatType === 'DAILY' || task.repeatType === 'WEEKLY') {
    if (start !== null && key < start) return false;
    if (due !== null && key > due) return false;
    if (task.repeatType === 'WEEKLY') return Array.isArray(task.repeatDaysOfWeek) && task.repeatDaysOfWeek.includes(dow);
    return true;
  }
  return due !== null && key === due;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483000 + 1;
}

export interface PlannedAlarm {
  id: number;
  at: Date;
  title: string;
  body: string;
  taskId: string;
}

export function planAlarms(tasks: AppTask[], now = new Date()): PlannedAlarm[] {
  const out: PlannedAlarm[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const j = gregorianToJalali(day.getFullYear(), day.getMonth() + 1, day.getDate());
    const dow = getDayOfWeek(j);
    for (const t of tasks) {
      if (t.isCompleted || t.isArchived) continue;
      if (!taskOccursOn(t, j.year, j.month, j.day, dow)) continue;

      const add = (kind: Kind, hm: { h: number; m: number } | null, title: string, body: string) => {
        if (!hm) return;
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hm.h, hm.m, 0);
        if (at.getTime() <= now.getTime() + 5000) return;
        out.push({ id: hash32(`${t.id}|${kind}|${j.year}-${j.month}-${j.day}`), at, title, body, taskId: t.id });
      };

      const start = parseHM(t.time);
      const end = parseHM(t.deadlineTime);
      if (start && t.reminderMinutesBefore && t.reminderMinutesBefore > 0) {
        const total = start.h * 60 + start.m - t.reminderMinutesBefore;
        if (total >= 0) add('REMIND', { h: Math.floor(total / 60), m: total % 60 }, `⏰ ${t.title}`, `تا شروع ${t.reminderMinutesBefore} دقیقه مانده`);
      }
      if (t.reminderTime && (!start || t.reminderTime !== t.time)) add('REMIND', parseHM(t.reminderTime), `⏰ ${t.title}`, 'یادآور تسک');
      add('START', start, `▶️ زمان شروع: ${t.title}`, t.notes || 'زمان شروع این کار فرا رسیده است.');
      add('END', end, `⌛ پایان مهلت: ${t.title}`, 'مهلت این کار رسیده است.');
    }
  }
  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  // unique ids, capped (Android limits pending alarms)
  const seen = new Set<number>();
  return out.filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true))).slice(0, MAX_NOTIFICATIONS);
}

let lastSignature = '';

export async function syncNativeAlarms(tasks: AppTask[], enabled = true): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const planned = enabled ? planAlarms(tasks) : [];
    const signature = planned.map(p => `${p.id}@${p.at.getTime()}`).join(',');
    if (signature === lastSignature) return;

    if (planned.length) {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
    }
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
    if (planned.length) {
      await LocalNotifications.schedule({
        notifications: planned.map(p => ({
          id: p.id,
          title: p.title,
          body: p.body,
          schedule: { at: p.at, allowWhileIdle: true },
          extra: { taskId: p.taskId },
        })),
      });
    }
    lastSignature = signature;
  } catch (err) {
    console.warn('Native alarm sync failed:', err);
  }
}

/** Android 12+: exact alarms need a user-granted setting; returns true if allowed (or not applicable). */
export async function ensureExactAlarmAllowed(): Promise<boolean> {
  if (!isCapacitorNative()) return true;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const s = await LocalNotifications.checkExactNotificationSetting();
    if (s.exact_alarm === 'granted') return true;
    const r = await LocalNotifications.changeExactNotificationSetting();
    return r.exact_alarm === 'granted';
  } catch {
    return true;
  }
}
