import { AppTask, ReminderSettings, AlarmSoundItem, CalendarEvent } from '../types';
import { playAlarmSound } from './soundService';

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
 * Calculates a new HH:mm time string given minutes from right now
 */
export function calculateSnoozeTime(minutesFromNow: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutesFromNow);
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Determines if a task reminder is due right now
 */
export function isTaskReminderDue(
  task: AppTask,
  currentJalaliDate: string, // e.g. "1405/01/01"
  currentTimeHHMM: string,   // e.g. "10:30"
  currentDayOfWeek: number   // 0=Saturday .. 6=Friday
): boolean {
  if (task.isCompleted) return false;

  const isReminderActive = task.reminderEnabled || task.isImportant;
  if (!isReminderActive) return false;

  const targetTime = getTaskEffectiveReminderTime(task);
  if (!targetTime) return false;

  // If this is an active smart snooze due today, check the time directly
  if (task.nextSnoozeAt) {
    if (task.nextSnoozeAt === currentTimeHHMM) {
      const slotKey = `${currentJalaliDate} ${currentTimeHHMM}`;
      return task.lastNotifiedAt !== slotKey;
    }
    return false;
  }

  // Standard checks: date matching
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
    // Undated tasks don't fire without an explicit reminderDate
    return false;
  }

  if (!dateMatches) return false;

  // Check time matching
  if (targetTime !== currentTimeHHMM) return false;

  // Check if already notified for this exact date & time slot
  const slotKey = `${currentJalaliDate} ${currentTimeHHMM}`;
  if (task.lastNotifiedAt === slotKey) {
    return false;
  }

  return true;
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

/**
 * Checks if a calendar event reminder is due right now
 */
export function isCalendarEventDue(
  event: CalendarEvent,
  currentJalaliDate: string, // e.g. "1405/07/28"
  currentTimeHHMM: string     // e.g. "10:30"
): boolean {
  if (!event.hasReminder) return false;

  // Date match check
  let dateMatches = false;
  if (event.repeatYearly) {
    // For yearly repeating events (like birthdays), match MM/DD
    const eventMMDD = event.date.slice(5);
    const currentMMDD = currentJalaliDate.slice(5);
    dateMatches = eventMMDD === currentMMDD;
  } else {
    dateMatches = event.date === currentJalaliDate;
  }

  if (!dateMatches) return false;

  // Time match check
  let targetTime = '09:00'; // default morning reminder if no specific time
  if (event.time) {
    targetTime = subtractMinutesFromHHMM(event.time, event.reminderMinutesBefore || 0);
  }

  return currentTimeHHMM === targetTime;
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
