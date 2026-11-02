import { AppTask, ReminderSettings, AlarmSoundItem, CalendarEvent } from '../types';
import { playAlarmSound } from './soundService';
import { gregorianToJalali, jalaliToFormattedString, toLatinDigits, addDaysJalali } from '../calendar/jalali';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Dispatches a native browser notification if granted
 */
export function sendBrowserNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  } = {}
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: options.body || 'زمان رسیدگی به این تسک مهم فرا رسیده است.',
      icon: options.icon || '/favicon.ico',
      tag: options.tag || `javaneh-task-${Date.now()}`,
      badge: '/favicon.ico',
      dir: 'rtl',
      lang: 'fa',
      requireInteraction: true,
    });

    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    return notification;
  } catch (err) {
    console.error('Browser notification could not be created:', err);
    return null;
  }
}

/**
 * Computes exact reminder HH:mm for a task, prioritizing nextSnoozeAt if present
 */
export function getTaskEffectiveReminderTime(task: AppTask): string | null {
  // 1. If task has a scheduled smart snooze time, that is the primary target
  if (task.nextSnoozeAt) {
    return task.nextSnoozeAt;
  }

  // 2. Explicit reminder time
  if (task.reminderTime) {
    return task.reminderTime;
  }

  // 3. Task execution time minus reminderMinutesBefore
  if (task.time) {
    if (task.reminderMinutesBefore && task.reminderMinutesBefore > 0) {
      const [hStr, mStr] = task.time.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m)) {
        let totalMin = h * 60 + m - task.reminderMinutesBefore;
        if (totalMin < 0) totalMin += 24 * 60; // wrap around day boundary
        const remH = Math.floor(totalMin / 60);
        const remM = totalMin % 60;
        return `${remH.toString().padStart(2, '0')}:${remM.toString().padStart(2, '0')}`;
      }
    }
    return task.time;
  }

  return null;
}

/**
 * Calculates a new HH:mm time string and target Jalali date given minutes from right now
 */
export function calculateSnoozeTarget(minutesFromNow: number): { time: string; jalaliDate: string } {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesFromNow);
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const jDate = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return {
    time: `${hours}:${mins}`,
    jalaliDate: jalaliToFormattedString(jDate),
  };
}

/**
 * Calculates a new HH:mm time string given minutes from right now (legacy helper)
 */
export function calculateSnoozeTime(minutesFromNow: number): string {
  return calculateSnoozeTarget(minutesFromNow).time;
}

export type TaskReminderDueReason = 'INITIAL' | 'USER_SNOOZE' | 'AUTO_RENOTIFY';

export interface ReminderDueCheckResult {
  isDue: boolean;
  reason?: TaskReminderDueReason;
  effectiveTime?: string;
  repeatCount?: number;
  uniqueKey?: string;
}

/**
 * Checks if a task is due for an alarm right now (handles initial, manual snooze, and auto re-notify)
 */
export function checkTaskReminderDueState(
  task: AppTask,
  currentJalaliDate: string,
  currentTimeHHMM: string,
  currentDayOfWeek: number
): ReminderDueCheckResult {
  if (task.isCompleted || task.isArchived) {
    return { isDue: false };
  }

  // 1. Check User-Initiated Repeat (Manual Snooze)
  if (task.nextSnoozeAt) {
    const isSnoozeToday = !task.nextSnoozeDate || task.nextSnoozeDate === currentJalaliDate;
    if (isSnoozeToday && task.nextSnoozeAt === currentTimeHHMM) {
      const repCount = task.snoozeCount || 1;
      return {
        isDue: true,
        reason: 'USER_SNOOZE',
        effectiveTime: task.nextSnoozeAt,
        repeatCount: repCount,
        uniqueKey: `task_${task.id}_snooze_${repCount}_${currentJalaliDate}_${task.nextSnoozeAt}`,
      };
    }
    // If nextSnoozeAt is scheduled for the future, don't trigger regular reminder early
    return { isDue: false };
  }

  // 2. Check Automatic Repetition (Auto Re-Notify if user ignored previous alarm)
  if (task.nextAutoReNotifyAt) {
    const isAutoToday = !task.nextAutoReNotifyDate || task.nextAutoReNotifyDate === currentJalaliDate;
    if (isAutoToday && task.nextAutoReNotifyAt === currentTimeHHMM) {
      const repCount = task.autoReNotifyCount || 1;
      return {
        isDue: true,
        reason: 'AUTO_RENOTIFY',
        effectiveTime: task.nextAutoReNotifyAt,
        repeatCount: repCount,
        uniqueKey: `task_${task.id}_autorepeat_${repCount}_${currentJalaliDate}_${task.nextAutoReNotifyAt}`,
      };
    }
  }

  // 3. Check Initial Scheduled Reminder
  const isReminderActive = task.reminderEnabled || task.isImportant;
  if (!isReminderActive) return { isDue: false };

  // Date matching
  let dateMatches = false;
  if (task.reminderDate) {
    dateMatches = task.reminderDate === currentJalaliDate;
  } else if (task.dueDate) {
    dateMatches = task.dueDate === currentJalaliDate;
  } else if (task.repeatType === 'DAILY') {
    dateMatches = true;
  } else if (task.repeatType === 'WEEKLY') {
    dateMatches = Array.isArray(task.repeatDaysOfWeek) && task.repeatDaysOfWeek.includes(currentDayOfWeek);
  } else {
    // If no explicit date is set, task with time or reminderTime matches today
    dateMatches = Boolean(task.time || task.reminderTime);
  }

  if (!dateMatches) return { isDue: false };

  const targetTime = getTaskEffectiveReminderTime(task);
  if (!targetTime || targetTime !== currentTimeHHMM) return { isDue: false };

  return {
    isDue: true,
    reason: 'INITIAL',
    effectiveTime: targetTime,
    repeatCount: 0,
    uniqueKey: `task_${task.id}_init_${currentJalaliDate}_${targetTime}`,
  };
}

/**
 * Legacy compatibility checker for tasks
 */
export function isTaskReminderDue(
  task: AppTask,
  currentJalaliDate: string,
  currentTimeHHMM: string,
  currentDayOfWeek: number
): boolean {
  return checkTaskReminderDueState(task, currentJalaliDate, currentTimeHHMM, currentDayOfWeek).isDue;
}

/**
 * Calculates time offset in minutes before a given HH:mm string.
 * Example: subtractMinutesFromHHMM("10:30", 15) => "10:15"
 */
export function subtractMinutesFromHHMM(timeHHMM: string, minutes: number): string {
  const parts = timeHHMM.split(':').map(p => parseInt(p, 10));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return timeHHMM;
  let totalMins = parts[0] * 60 + parts[1] - minutes;
  if (totalMins < 0) totalMins += 24 * 60;
  totalMins = totalMins % (24 * 60);
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const m = String(totalMins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Checks if this is an advance holiday reminder due right now for a task.
 */
export function isTaskHolidayAdvanceReminderDue(
  task: AppTask,
  currentJalaliDate: string,
  currentTimeHHMM: string,
  currentDayOfWeek: number,
  isHolidayToday: boolean,
  leadMinutes: number = 15
): boolean {
  if (task.isCompleted || !isHolidayToday) return false;

  const targetTime = task.time || task.reminderTime;
  if (!targetTime) return false;

  // Verify date relevance
  let dateMatches = false;
  if (task.reminderDate) {
    dateMatches = task.reminderDate === currentJalaliDate;
  } else if (task.dueDate) {
    dateMatches = task.dueDate === currentJalaliDate;
  } else if (task.repeatType === 'DAILY') {
    dateMatches = true;
  } else if (task.repeatType === 'WEEKLY') {
    dateMatches = Array.isArray(task.repeatDaysOfWeek) && task.repeatDaysOfWeek.includes(currentDayOfWeek);
  } else {
    return false;
  }

  if (!dateMatches) return false;

  // Target trigger time is (targetTime - leadMinutes)
  const holidayTriggerTime = subtractMinutesFromHHMM(targetTime, leadMinutes);
  if (currentTimeHHMM !== holidayTriggerTime) return false;

  const slotKey = `holiday-advance-${currentJalaliDate} ${currentTimeHHMM}`;
  if (task.lastNotifiedAt === slotKey) {
    return false;
  }

  return true;
}

/**
 * Fires reminder: Browser notification + gentle audio alarm
 */
export function triggerReminderAlarm(
  task: AppTask,
  settings: ReminderSettings,
  onTaskClick?: () => void,
  holidayNotice?: string
): () => void {
  // 1. Audio Alarm
  let stopAudio: () => void = () => {};
  if (settings.soundEnabled) {
    const soundIdToPlay = task.customAlarmSound || settings.selectedSoundId || 'serenity';
    stopAudio = playAlarmSound(soundIdToPlay, settings.customSounds || [], settings.volume);
  }

  // 2. Browser Native Notification
  const title = holidayNotice 
    ? `🗓️ یادآور روز تعطیل: ${task.title}` 
    : `یادآور جوانه: ${task.title}`;
  
  const bodyText = holidayNotice
    ? `امروز (${holidayNotice}) است! تسک شما در ساعت ${task.time || task.reminderTime || ''} شروع می‌شود.`
    : (task.notes ? `${task.notes}\nزمان: ${task.time || ''}` : `موعد این تسک مهم فرا رسیده است.`);

  sendBrowserNotification(title, {
    body: bodyText,
    tag: `task-${task.id}`,
    onClick: onTaskClick,
  });

  return stopAudio;
}

export interface CalendarEventDueResult {
  isDue: boolean;
  reason?: TaskReminderDueReason;
  effectiveTime?: string;
  repeatCount?: number;
  dayOffset?: number;
  uniqueKey?: string;
}

/**
 * Checks if a calendar event is due for an alarm right now (handles initial, manual snooze, and auto re-notify)
 */
export function checkCalendarEventDueState(
  event: CalendarEvent,
  currentJalaliDate: string,
  currentTimeHHMM: string
): CalendarEventDueResult {
  if (event.hasReminder === false) {
    return { isDue: false };
  }

  // 1. Check User-Initiated Repeat (Manual Snooze)
  if (event.nextSnoozeAt) {
    const isSnoozeToday = !event.nextSnoozeDate || event.nextSnoozeDate === currentJalaliDate;
    if (isSnoozeToday && event.nextSnoozeAt === currentTimeHHMM) {
      const repCount = event.snoozeCount || 1;
      return {
        isDue: true,
        reason: 'USER_SNOOZE',
        effectiveTime: event.nextSnoozeAt,
        repeatCount: repCount,
        dayOffset: 0,
        uniqueKey: `calev_${event.id}_snooze_${repCount}_${currentJalaliDate}_${event.nextSnoozeAt}`,
      };
    }
    // If nextSnoozeAt is scheduled for the future, don't trigger regular reminder early
    return { isDue: false };
  }

  // 2. Check Automatic Repetition (Auto Re-Notify if user ignored previous alarm)
  if (event.nextAutoReNotifyAt) {
    const isAutoToday = !event.nextAutoReNotifyDate || event.nextAutoReNotifyDate === currentJalaliDate;
    if (isAutoToday && event.nextAutoReNotifyAt === currentTimeHHMM) {
      const repCount = event.autoReNotifyCount || 1;
      return {
        isDue: true,
        reason: 'AUTO_RENOTIFY',
        effectiveTime: event.nextAutoReNotifyAt,
        repeatCount: repCount,
        dayOffset: 0,
        uniqueKey: `calev_${event.id}_autorepeat_${repCount}_${currentJalaliDate}_${event.nextAutoReNotifyAt}`,
      };
    }
  }

  // 3. Check Initial Scheduled Reminder
  const daysToNotify = event.reminderDays && event.reminderDays.length > 0 ? event.reminderDays : [0];
  const rawTimes = new Set<string>();
  if (event.reminderTimes && event.reminderTimes.length > 0) {
    event.reminderTimes.forEach((t) => {
      const norm = t?.trim();
      if (norm) rawTimes.add(norm);
    });
  }
  if (event.time) {
    const norm = event.time.trim();
    if (norm) rawTimes.add(norm);
  }
  if (rawTimes.size === 0) {
    rawTimes.add('09:00');
  }
  const timesToNotify = Array.from(rawTimes);

  const evParts = event.date.split('/').map((p) => parseInt(toLatinDigits(p), 10));
  if (evParts.length !== 3 || isNaN(evParts[0])) return { isDue: false };
  const evJDate = { year: evParts[0], month: evParts[1], day: evParts[2] };

  for (const dayOffset of daysToNotify) {
    const remJDate = addDaysJalali(evJDate, -dayOffset);
    const remDateStr = jalaliToFormattedString(remJDate);

    const dateMatches = event.repeatYearly
      ? remDateStr.slice(5) === currentJalaliDate.slice(5)
      : remDateStr === currentJalaliDate;

    if (!dateMatches) continue;

    for (const timeStr of timesToNotify) {
      if (timeStr === currentTimeHHMM) {
        return {
          isDue: true,
          reason: 'INITIAL',
          effectiveTime: timeStr,
          repeatCount: 0,
          dayOffset,
          uniqueKey: `calev_${event.id}_init_${currentJalaliDate}_day${dayOffset}_${timeStr}`,
        };
      }
    }
  }

  return { isDue: false };
}

/**
 * Legacy compatibility checker for calendar events
 */
export function isCalendarEventDue(
  event: CalendarEvent,
  currentJalaliDate: string,
  currentTimeHHMM: string
): boolean {
  return checkCalendarEventDueState(event, currentJalaliDate, currentTimeHHMM).isDue;
}

/**
 * Triggers native notification and chime for calendar events
 */
export function triggerCalendarEventAlarm(
  event: CalendarEvent,
  settings: ReminderSettings,
  onEventClick?: () => void
): () => void {
  let stopAudio: () => void = () => {};
  if (settings.soundEnabled) {
    stopAudio = playAlarmSound(settings.selectedSoundId || 'serenity', settings.customSounds || [], settings.volume);
  }

  const typeLabels: Record<string, { icon: string; name: string }> = {
    BIRTHDAY: { icon: '🎂', name: 'تولد' },
    MEETING: { icon: '👥', name: 'جلسه / قرار کاری' },
    REMINDER: { icon: '🔔', name: 'یادآوری تقویم' },
    OCCASION: { icon: '💐', name: 'مناسبت شخصی' },
    ANNIVERSARY: { icon: '🎉', name: 'سالگرد' },
    OTHER: { icon: '📌', name: 'رویداد تقویم' },
  };

  const meta = typeLabels[event.type] || { icon: '📅', name: 'رویداد تقویم' };
  const title = `${meta.icon} یادآور تقویم: ${event.title}`;
  const bodyText = `${meta.name}${event.time ? ` در ساعت ${event.time}` : ''}\n${event.description || 'زمان یادآوری این رویداد در تقویم فرارسیده است.'}`;

  sendBrowserNotification(title, {
    body: bodyText,
    tag: `calevent-${event.id}`,
    onClick: onEventClick,
  });

  return stopAudio;
}
