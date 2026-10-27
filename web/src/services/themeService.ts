import { DarkModePreference, DarkModeSchedule, UserProfile } from '../types';

export const THEME_STORAGE_KEYS = {
  PREFERENCE: 'javaneh_dark_mode_preference',
  SCHEDULE_START: 'javaneh_dark_mode_schedule_start',
  SCHEDULE_END: 'javaneh_dark_mode_schedule_end',
  LEGACY_DARK: 'javaneh_dark_mode',
  THEME_COLOR: 'javaneh_theme_color',
};

export const DEFAULT_DARK_MODE_SCHEDULE: DarkModeSchedule = {
  start: '20:00', // ساعت ۸ شب (غروب آفتاب)
  end: '06:30',   // ساعت ۶:۳۰ صبح (طلوع آفتاب)
};

/**
 * Parses time string (HH:mm) into minutes elapsed from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  const hours = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 0));
  const minutes = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
  return hours * 60 + minutes;
}

/**
 * Checks if a given time is within the scheduled interval
 */
export function isTimeInSchedule(schedule: DarkModeSchedule, targetDate: Date = new Date()): boolean {
  try {
    const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
    const startMinutes = timeStringToMinutes(schedule.start);
    const endMinutes = timeStringToMinutes(schedule.end);

    if (startMinutes === endMinutes) return false;

    if (startMinutes < endMinutes) {
      // Normal range within same day (e.g. 13:00 to 18:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Range spans midnight (e.g. 20:00 to 06:30)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch {
    return false;
  }
}

/**
 * Detects whether the device OS / browser prefers dark mode
 */
export function isSystemDarkMode(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * Resolves saved dark mode preference
 */
export function getDarkModePreference(userProfile?: UserProfile | null): DarkModePreference {
  if (userProfile?.darkModePreference) {
    return userProfile.darkModePreference;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEYS.PREFERENCE) as DarkModePreference | null;
      if (stored && ['LIGHT', 'DARK', 'SYSTEM', 'SCHEDULE'].includes(stored)) {
        return stored;
      }
      // Backward compatibility check
      const legacy = localStorage.getItem(THEME_STORAGE_KEYS.LEGACY_DARK);
      if (legacy === 'true' || userProfile?.darkMode === true) {
        return 'DARK';
      }
    } catch {}
  }

  return 'SYSTEM';
}

/**
 * Resolves saved dark mode schedule hours
 */
export function getDarkModeSchedule(userProfile?: UserProfile | null): DarkModeSchedule {
  if (userProfile?.darkModeSchedule?.start && userProfile?.darkModeSchedule?.end) {
    return userProfile.darkModeSchedule;
  }

  if (typeof window !== 'undefined') {
    try {
      const start = localStorage.getItem(THEME_STORAGE_KEYS.SCHEDULE_START);
      const end = localStorage.getItem(THEME_STORAGE_KEYS.SCHEDULE_END);
      if (start && end) {
        return { start, end };
      }
    } catch {}
  }

  return DEFAULT_DARK_MODE_SCHEDULE;
}

/**
 * Computes whether dark mode should actively be engaged right now
 */
export function computeEffectiveDarkMode(
  preference: DarkModePreference,
  schedule: DarkModeSchedule = DEFAULT_DARK_MODE_SCHEDULE,
  targetDate: Date = new Date()
): boolean {
  switch (preference) {
    case 'DARK':
      return true;
    case 'LIGHT':
      return false;
    case 'SYSTEM':
      return isSystemDarkMode();
    case 'SCHEDULE':
      return isTimeInSchedule(schedule, targetDate);
    default:
      return false;
  }
}

/**
 * Applies dark mode class and colorScheme to root HTML element
 */
export function applyDarkMode(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-color-mode', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_STORAGE_KEYS.LEGACY_DARK, isDark ? 'true' : 'false');
  } catch {}
}

/**
 * Initializes and synchronizes theme immediately on startup
 */
export function initThemeOnStartup(userProfile?: UserProfile | null): boolean {
  const pref = getDarkModePreference(userProfile);
  const sched = getDarkModeSchedule(userProfile);
  const isDark = computeEffectiveDarkMode(pref, sched);
  applyDarkMode(isDark);
  return isDark;
}

/**
 * Listens for system or time changes and triggers theme recalculation
 */
export function setupThemeListeners(
  preference: DarkModePreference,
  schedule: DarkModeSchedule,
  onStateChange?: (isDark: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let intervalId: any = null;
  let mediaQuery: MediaQueryList | null = null;
  let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  const update = () => {
    const isDark = computeEffectiveDarkMode(preference, schedule);
    applyDarkMode(isDark);
    if (onStateChange) {
      onStateChange(isDark);
    }
  };

  // Immediate check
  update();

  // 1. System listener
  if (preference === 'SYSTEM' && window.matchMedia) {
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaListener = () => update();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', mediaListener);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(mediaListener);
      }
    } catch {}
  }

  // 2. Schedule listener (checks every 20 seconds for smooth transitions)
  if (preference === 'SCHEDULE') {
    intervalId = setInterval(update, 20000);
  }

  return () => {
    if (intervalId) clearInterval(intervalId);
    if (mediaQuery && mediaListener) {
      try {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', mediaListener);
        } else if ((mediaQuery as any).removeListener) {
          (mediaQuery as any).removeListener(mediaListener);
        }
      } catch {}
    }
  };
}
