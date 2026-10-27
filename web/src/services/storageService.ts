import {
  AppTask,
  Category,
  Goal,
  Habit,
  UserProfile,
  ReminderSettings,
  CalendarEvent,
  AppPreferences,
  AppBackupData,
} from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';
import { getCurrentPersianDateTimeString } from '../calendar/jalali';
import { APP_VERSION_INFO } from '../version';

export interface AppDataPayload {
  categories: Category[];
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  calendarEvents?: CalendarEvent[];
  userProfile?: UserProfile;
  reminderSettings?: ReminderSettings;
  appPreferences?: AppPreferences;
  initialized?: boolean;
  lastUpdated?: number;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'باغبان جوانه',
  title: 'در مسیر رشد و پویایی',
  avatarUrl: '🌱',
  bio: 'هر روز با مراقبت از عادت‌ها و وظایف کوچک، اهداف بزرگ سالانه‌ام را به بار می‌نشانم.',
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  soundEnabled: true,
  selectedSoundId: 'serenity',
  volume: 0.8,
  customSounds: [],
  snoozeIntervalMinutes: 10,
  availableSnoozeIntervals: [5, 10, 15, 30, 60],
  autoReNotifyCount: 2,
  autoReNotifyIntervalMinutes: 10,
  notifyBeforeHolidayTasks: true,
  holidayLeadMinutes: 15,
};

export const STORAGE_KEYS = {
  CATEGORIES: 'javaneh_categories',
  GOALS: 'javaneh_goals',
  TASKS: 'javaneh_tasks',
  HABITS: 'javaneh_habits',
  CALENDAR_EVENTS: 'javaneh_calendar_events',
  USER_PROFILE: 'javaneh_user_profile',
  PROFILE: 'javaneh_user_profile',
  REMINDER_SETTINGS: 'javaneh_reminder_settings',
  REMINDERS: 'javaneh_reminder_settings',
  INITIALIZED: 'javaneh_initialized',
  LAST_SYNC: 'javaneh_last_sync',
  USER_ID: 'javaneh_user_uuid',
  APP_VERSION: 'javaneh_installed_version',
  PRE_UPDATE_BACKUP: 'javaneh_pre_update_backup',
  LAST_EXPORTED_BACKUP: 'javaneh_last_exported_backup',
};

// Generates or retrieves the unique isolated device user ID
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'device-isolated-user';
  try {
    let id = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.USER_ID, id);
    }
    return id;
  } catch {
    return 'device-isolated-user';
  }
}

/**
 * Reads all UI / theme / animation / haptic / GitHub preferences from localStorage & UserProfile
 */
export function collectCurrentAppPreferences(userProfile?: UserProfile): AppPreferences {
  if (typeof window === 'undefined') return {};
  try {
    const themeColor =
      userProfile?.themeColor || localStorage.getItem('javaneh_theme_color') || 'emerald';
    const darkModePreference =
      userProfile?.darkModePreference ||
      (localStorage.getItem('javaneh_dark_mode_preference') as any) ||
      'LIGHT';
    const scheduleStart =
      userProfile?.darkModeSchedule?.start ||
      localStorage.getItem('javaneh_dark_mode_schedule_start') ||
      '20:00';
    const scheduleEnd =
      userProfile?.darkModeSchedule?.end ||
      localStorage.getItem('javaneh_dark_mode_schedule_end') ||
      '06:30';
    const enablePlantAnimations = localStorage.getItem('javaneh_plant_animations') !== 'false';
    const enableHapticFeedback = localStorage.getItem('javaneh_haptic_feedback') !== 'false';

    let githubSyncConfig = null;
    const rawGh = localStorage.getItem('javaneh_github_sync_config');
    if (rawGh) {
      try {
        githubSyncConfig = JSON.parse(rawGh);
      } catch {}
    }

    return {
      themeColor,
      darkMode: Boolean(userProfile?.darkMode),
      darkModePreference,
      darkModeSchedule: { start: scheduleStart, end: scheduleEnd },
      enablePlantAnimations,
      enableHapticFeedback,
      githubSyncConfig,
    };
  } catch {
    return {};
  }
}

/**
 * Restores all UI / theme / animation / haptic / GitHub preferences into localStorage & DOM
 */
export function applyRestoredAppPreferences(
  prefs?: AppPreferences,
  userProfile?: UserProfile
): void {
  if (typeof window === 'undefined') return;
  try {
    const themeColor = prefs?.themeColor || userProfile?.themeColor;
    if (themeColor) {
      localStorage.setItem('javaneh_theme_color', themeColor);
      document.documentElement.setAttribute('data-app-theme', themeColor);
    }
    const darkPref = prefs?.darkModePreference || userProfile?.darkModePreference;
    if (darkPref) {
      localStorage.setItem('javaneh_dark_mode_preference', darkPref);
    }
    const sched = prefs?.darkModeSchedule || userProfile?.darkModeSchedule;
    if (sched?.start) {
      localStorage.setItem('javaneh_dark_mode_schedule_start', sched.start);
    }
    if (sched?.end) {
      localStorage.setItem('javaneh_dark_mode_schedule_end', sched.end);
    }
    if (typeof prefs?.enablePlantAnimations === 'boolean') {
      localStorage.setItem(
        'javaneh_plant_animations',
        prefs.enablePlantAnimations ? 'true' : 'false'
      );
    }
    if (typeof prefs?.enableHapticFeedback === 'boolean') {
      localStorage.setItem(
        'javaneh_haptic_feedback',
        prefs.enableHapticFeedback ? 'true' : 'false'
      );
    }
    if (prefs?.githubSyncConfig) {
      localStorage.setItem('javaneh_github_sync_config', JSON.stringify(prefs.githubSyncConfig));
    }
  } catch {}
}

/**
 * Builds a 100% complete full-state backup payload containing every entity and setting in Javaneh.
 */
export function buildCompleteAppBackupPayload(data: AppDataPayload): AppBackupData {
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const habits = Array.isArray(data.habits) ? data.habits : [];
  const calendarEvents = Array.isArray(data.calendarEvents) ? data.calendarEvents : [];
  const userProfile = data.userProfile || loadUserProfileWithFallback();
  const reminderSettings =
    data.reminderSettings ||
    loadFromLocalStorage<ReminderSettings>(
      STORAGE_KEYS.REMINDER_SETTINGS,
      DEFAULT_REMINDER_SETTINGS
    );
  const appPreferences = data.appPreferences || collectCurrentAppPreferences(userProfile);

  return {
    appName: 'جوانه (Javaneh)',
    dataType: 'FULL_DATA_BACKUP',
    version: APP_VERSION_INFO.currentVersion,
    versionCode: APP_VERSION_INFO.currentVersionCode,
    exportDate: new Date().toISOString(),
    exportPersianDate: getCurrentPersianDateTimeString(),
    userId: getOrCreateUserId(),
    counts: {
      categories: categories.length,
      goals: goals.length,
      tasks: tasks.length,
      habits: habits.length,
      calendarEvents: calendarEvents.length,
      customSounds: reminderSettings?.customSounds?.length || 0,
      hasProfileAvatar: Boolean(
        userProfile?.avatarUrl && userProfile.avatarUrl.startsWith('data:image')
      ),
    },
    categories,
    goals,
    tasks,
    habits,
    calendarEvents,
    userProfile,
    reminderSettings,
    appPreferences,
  };
}

/**
 * Universal Export/Save for Full Backup that works in BOTH Android APK WebView (file://) and Web/Windows.
 */
export async function exportBackupFileUniversal(
  filenameOrPayload: string | AppBackupData,
  jsonStringOrFilename: string
): Promise<{ method: 'ANDROID_NATIVE' | 'WEB_BLOB' | 'CLIPBOARD'; message: string }> {
  let filename: string;
  let jsonString: string;

  if (typeof filenameOrPayload === 'string') {
    filename = filenameOrPayload;
    jsonString = jsonStringOrFilename;
  } else {
    filename = jsonStringOrFilename;
    jsonString = JSON.stringify(filenameOrPayload, null, 2);
  }

  // 1. Always save a local copy in localStorage/IndexedDB so it is immediately protected
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_EXPORTED_BACKUP, jsonString);
    const parsedForIdb =
      typeof filenameOrPayload === 'string' ? JSON.parse(jsonString) : filenameOrPayload;
    saveToIndexedDB(STORAGE_KEYS.LAST_EXPORTED_BACKUP, parsedForIdb).catch(() => {});
  } catch {}

  // 2. Also copy to clipboard in the background if supported (convenient instant backup)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonString).catch(() => {});
    }
  } catch {}

  const isAndroidApkWebView =
    typeof window !== 'undefined' && window.location.protocol === 'file:';

  // 3. In Android APK WebView: invoke native SAF CREATE_DOCUMENT dialog via AppChromeClient.onJsPrompt or AppWebViewClient
  if (isAndroidApkWebView) {
    const androidBridge = (window as any).AndroidBridge;
    if (androidBridge && typeof androidBridge.saveFile === 'function') {
      androidBridge.saveFile(filename, jsonString, 'application/json');
      return {
        method: 'ANDROID_NATIVE',
        message: 'پنجره ذخیره فایل پشتیبان کامل در حافظه گوشی باز شد (همچنین یک نسخه در کلیپ‌بورد کپی گردید).',
      };
    }

    try {
      if (typeof window.prompt === 'function') {
        const res = window.prompt('javaneh-save:' + filename, jsonString);
        if (res === 'OK') {
          return {
            method: 'ANDROID_NATIVE',
            message: 'پنجره ذخیره فایل پشتیبان کامل (JSON) در حافظه گوشی باز شد (و کد پشتیبان نیز در کلیپ‌بورد کپی شد).',
          };
        }
      }
    } catch {}

    // Fallback to AppWebViewClient shouldOverrideUrlLoading("javaneh-save:...")
    window.location.href =
      'javaneh-save:' + encodeURIComponent(filename) + '?data=' + encodeURIComponent(jsonString);
    return {
      method: 'ANDROID_NATIVE',
      message: 'پنجره ذخیره فایل پشتیبان کامل (JSON) در حافظه گوشی باز شد (و کد پشتیبان نیز در کلیپ‌بورد کپی شد).',
    };
  }

  // 4. Standard Web / Windows Browser download via Blob URL
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);

  return {
    method: 'WEB_BLOB',
    message: 'فایل پشتیبان کامل تمام بخش‌های برنامه با موفقیت دانلود شد.',
  };
}

/**
 * Universal Share for Full Backup that works in BOTH Android APK WebView (file://) and Mobile/Desktop Web.
 */
export async function shareBackupFileUniversal(
  filenameOrPayload: string | AppBackupData,
  jsonStringOrFilename: string,
  shareTitle = 'پشتیبان کامل برنامه جوانه'
): Promise<{ method: string; message: string }> {
  let filename: string;
  let jsonString: string;

  if (typeof filenameOrPayload === 'string') {
    filename = filenameOrPayload;
    jsonString = jsonStringOrFilename;
  } else {
    filename = jsonStringOrFilename;
    jsonString = JSON.stringify(filenameOrPayload, null, 2);
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonString).catch(() => {});
    }
  } catch {}

  const isAndroidApkWebView =
    typeof window !== 'undefined' && window.location.protocol === 'file:';

  if (isAndroidApkWebView) {
    try {
      if (typeof window.prompt === 'function') {
        const res = window.prompt('javaneh-share:' + filename, jsonString);
        if (res === 'OK') {
          return {
            method: 'ANDROID_SHARE',
            message: 'منوی اشتراک‌گذاری اندروید برای ارسال پشتیبان کامل باز شد.',
          };
        }
      }
    } catch {}

    window.location.href =
      'javaneh-share:' + encodeURIComponent(filename) + '?text=' + encodeURIComponent(jsonString);
    return {
      method: 'ANDROID_SHARE',
      message: 'منوی اشتراک‌گذاری اندروید برای ارسال پشتیبان کامل باز شد.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (typeof File !== 'undefined') {
        const file = new File([jsonString], filename, { type: 'application/json;charset=utf-8' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: shareTitle,
            text: 'فایل پشتیبان کامل تمام داده‌های اپلیکیشن جوانه',
          });
          return {
            method: 'WEB_SHARE_FILE',
            message: 'فایل پشتیبان کامل با موفقیت به اشتراک گذاشته شد.',
          };
        }
      }
      await navigator.share({
        title: shareTitle,
        text: jsonString,
      });
      return {
        method: 'WEB_SHARE_TEXT',
        message: 'داده‌های پشتیبان کامل با موفقیت به اشتراک گذاشته شد.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { method: 'ABORTED', message: 'اشتراک‌گذاری لغو شد.' };
      }
    }
  }

  return exportBackupFileUniversal(filename, jsonString);
}

const IDB_NAME = 'JavanehDB';
const IDB_STORE = 'app_data';

// --- Helpers for Safe Hydration & Merge ---
export function mergeEntitiesById<T extends { id: string }>(...lists: (T[] | null | undefined)[]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && typeof item === 'object' && item.id) {
          map.set(item.id, { ...(map.get(item.id) || {}), ...item });
        }
      }
    }
  }
  return Array.from(map.values());
}

// Backup snapshot to prevent any data loss
const SNAPSHOT_KEY = 'javaneh_backup_snapshot';

export function saveLocalSnapshot(data: AppDataPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem(SNAPSHOT_KEY);
    let historySnapshots: Array<{ timestamp: number; payload: AppDataPayload }> = [];
    if (existingRaw) {
      try {
        historySnapshots = JSON.parse(existingRaw);
      } catch {}
    }
    const hasContent =
      (data.goals && data.goals.length > 0) ||
      (data.tasks && data.tasks.length > 0) ||
      (data.habits && data.habits.length > 0) ||
      (data.calendarEvents && data.calendarEvents.length > 0) ||
      Boolean(data.userProfile?.name);

    if (hasContent) {
      const snapshotPayload: AppDataPayload = {
        categories: data.categories || [],
        goals: data.goals || [],
        tasks: data.tasks || [],
        habits: data.habits || [],
        calendarEvents: data.calendarEvents || [],
        userProfile: data.userProfile,
        reminderSettings: data.reminderSettings,
        appPreferences: data.appPreferences || collectCurrentAppPreferences(data.userProfile),
        lastUpdated: Date.now(),
      };
      historySnapshots.unshift({
        timestamp: Date.now(),
        payload: snapshotPayload,
      });
      // Keep last 4 snapshots to avoid exceeding localStorage 5MB quota when custom avatars/sounds exist
      historySnapshots = historySnapshots.slice(0, 4);
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(historySnapshots));
      saveToIndexedDB('latest_snapshot', snapshotPayload).catch(() => {});
    }
  } catch (e) {
    console.warn('Failed to save local snapshot:', e);
  }
}

export function resetLocalSnapshotsWithData(data: AppDataPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const historySnapshots = [
      {
        timestamp: Date.now(),
        payload: {
          categories: data.categories || [],
          goals: data.goals || [],
          tasks: data.tasks || [],
          habits: data.habits || [],
          calendarEvents: data.calendarEvents || [],
          userProfile: data.userProfile,
          reminderSettings: data.reminderSettings,
          appPreferences: data.appPreferences || collectCurrentAppPreferences(data.userProfile),
        },
      },
    ];
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(historySnapshots));
  } catch (e) {
    console.warn('Failed to reset local snapshots:', e);
  }
}

export function getLocalSnapshots(): Array<{ timestamp: number; payload: AppDataPayload }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Checks whether the current device already has saved user data in localStorage, snapshots, or upgrade archives.
 */
export function hasExistingLocalUserData(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (
      localStorage.getItem(STORAGE_KEYS.TASKS) !== null ||
      localStorage.getItem(STORAGE_KEYS.GOALS) !== null ||
      localStorage.getItem(STORAGE_KEYS.HABITS) !== null ||
      localStorage.getItem(STORAGE_KEYS.USER_PROFILE) !== null
    ) {
      return true;
    }
    if (getLocalSnapshots().length > 0) return true;
    if (getPreUpdateBackup() !== null) return true;
    if (getVersionUpgradeHistory().length > 0) return true;
  } catch {}
  return false;
}

/**
 * Loads an entity list synchronously from:
 * 1) Direct localStorage key
 * 2) Local snapshots (javaneh_backup_snapshot)
 * 3) Pre-update backup (javaneh_pre_update_backup)
 * 4) Version upgrade history (javaneh_upgrade_history)
 * 5) Only if none exist at all, falls back to fallbackFn()
 */
export function loadEntityListWithFallback<T>(
  key: string,
  field: 'categories' | 'goals' | 'tasks' | 'habits' | 'calendarEvents',
  fallback: T[] | (() => T[])
): T[] {
  const resolveFallback = (): T[] => {
    try {
      if (typeof fallback === 'function') {
        return (fallback as () => T[])() || [];
      }
      return Array.isArray(fallback) ? fallback : [];
    } catch {
      return [];
    }
  };

  if (typeof window === 'undefined') return resolveFallback();
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    }
  } catch {}

  // Check snapshots
  try {
    const snapshots = getLocalSnapshots();
    for (const snap of snapshots) {
      const arr = snap.payload?.[field];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr as unknown as T[];
      }
    }
  } catch {}

  // Check pre-update backup
  try {
    const pre = getPreUpdateBackup();
    const arr = pre?.data?.[field];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr as unknown as T[];
    }
  } catch {}

  // Check version upgrade history
  try {
    const hist = getVersionUpgradeHistory();
    for (const h of hist) {
      const arr = h.backupData?.[field];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr as unknown as T[];
      }
    }
  } catch {}

  return resolveFallback();
}

/**
 * Immediate multi-layer persistence for UserProfile so profile edits in Android WebView
 * are saved synchronously to localStorage, IndexedDB, and latest snapshot.
 */
export function saveUserProfileImmediate(profile: UserProfile): UserProfile {
  const existing = loadUserProfileWithFallback();
  const merged: UserProfile = {
    ...DEFAULT_USER_PROFILE,
    ...existing,
    ...profile,
    name: (profile.name ?? existing.name ?? DEFAULT_USER_PROFILE.name).trim() || DEFAULT_USER_PROFILE.name,
  };

  saveToLocalStorage(STORAGE_KEYS.USER_PROFILE, merged);
  saveToIndexedDB(STORAGE_KEYS.USER_PROFILE, merged).catch(() => {});
  saveToIndexedDB('userProfile', merged).catch(() => {});

  // Also update the latest snapshot's userProfile immediately
  try {
    const snapshots = getLocalSnapshots();
    if (snapshots.length > 0 && snapshots[0].payload) {
      snapshots[0].payload.userProfile = merged;
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
    }
  } catch {}

  return merged;
}

export function loadUserProfileWithFallback(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER_PROFILE;
  try {
    const direct = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (direct) {
      const parsed = JSON.parse(direct);
      if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
        return { ...DEFAULT_USER_PROFILE, ...parsed };
      }
    }
  } catch {}

  // Check snapshots if direct key was missing
  try {
    const snapshots = getLocalSnapshots();
    for (const snap of snapshots) {
      if (snap.payload?.userProfile && snap.payload.userProfile.name) {
        return { ...DEFAULT_USER_PROFILE, ...snap.payload.userProfile };
      }
    }
  } catch {}

  // Check pre-update backup if present
  try {
    const pre = getPreUpdateBackup();
    if (pre?.data?.userProfile && pre.data.userProfile.name) {
      return { ...DEFAULT_USER_PROFILE, ...pre.data.userProfile };
    }
  } catch {}

  return DEFAULT_USER_PROFILE;
}

// Deep recovery across all available local stores (IndexedDB + localStorage + Snapshots)
export async function recoverAllLocalData(): Promise<AppDataPayload> {
  const idbCats = await loadFromIndexedDB<Category[]>(STORAGE_KEYS.CATEGORIES);
  const idbGoals = await loadFromIndexedDB<Goal[]>(STORAGE_KEYS.GOALS);
  const idbTasks = await loadFromIndexedDB<AppTask[]>(STORAGE_KEYS.TASKS);
  const idbHabits = await loadFromIndexedDB<Habit[]>(STORAGE_KEYS.HABITS);
  const idbEvents = await loadFromIndexedDB<CalendarEvent[]>(STORAGE_KEYS.CALENDAR_EVENTS);
  const idbProfile =
    (await loadFromIndexedDB<UserProfile>(STORAGE_KEYS.USER_PROFILE)) ||
    (await loadFromIndexedDB<UserProfile>('userProfile'));
  const idbReminders = await loadFromIndexedDB<ReminderSettings>(STORAGE_KEYS.REMINDER_SETTINGS);

  const lsCats = loadFromLocalStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  const lsGoals = loadFromLocalStorage<Goal[]>(STORAGE_KEYS.GOALS, []);
  const lsTasks = loadFromLocalStorage<AppTask[]>(STORAGE_KEYS.TASKS, []);
  const lsHabits = loadFromLocalStorage<Habit[]>(STORAGE_KEYS.HABITS, []);
  const lsEvents = loadFromLocalStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR_EVENTS, []);
  const lsProfile = loadUserProfileWithFallback();
  const lsReminders = loadFromLocalStorage<ReminderSettings>(
    STORAGE_KEYS.REMINDER_SETTINGS,
    DEFAULT_REMINDER_SETTINGS
  );

  const snapshots = getLocalSnapshots();
  const latestSnap = snapshots[0]?.payload;

  const mergedCategories = mergeEntitiesById(
    INITIAL_CATEGORIES,
    latestSnap?.categories,
    idbCats,
    lsCats
  );
  // Prefer direct localStorage/IndexedDB; fall back to latest snapshot if empty
  const mergedGoals =
    lsGoals.length > 0
      ? mergeEntitiesById(idbGoals, lsGoals)
      : mergeEntitiesById(latestSnap?.goals, idbGoals);
  const mergedTasks =
    lsTasks.length > 0
      ? mergeEntitiesById(idbTasks, lsTasks)
      : mergeEntitiesById(latestSnap?.tasks, idbTasks);
  const mergedHabits =
    lsHabits.length > 0
      ? mergeEntitiesById(idbHabits, lsHabits)
      : mergeEntitiesById(latestSnap?.habits, idbHabits);
  const mergedEvents = mergeEntitiesById(latestSnap?.calendarEvents, idbEvents, lsEvents);

  const effectiveProfile: UserProfile =
    lsProfile && lsProfile.name !== DEFAULT_USER_PROFILE.name
      ? lsProfile
      : idbProfile && idbProfile.name
      ? { ...DEFAULT_USER_PROFILE, ...idbProfile, ...lsProfile }
      : lsProfile;

  const effectiveReminders: ReminderSettings = {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(idbReminders || {}),
    ...(lsReminders || {}),
  };

  return {
    categories: mergedCategories,
    goals: mergedGoals,
    tasks: mergedTasks,
    habits: mergedHabits,
    calendarEvents: mergedEvents,
    userProfile: effectiveProfile,
    reminderSettings: effectiveReminders,
    appPreferences: collectCurrentAppPreferences(effectiveProfile),
    initialized: true,
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open failed, fallback to localStorage only');
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB not supported or accessible', e);
      resolve(null);
    }
  });
}

export async function saveToIndexedDB(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// --- LocalStorage + IndexedDB Dual Helpers ---
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.warn(`Failed reading localStorage key "${key}"`, e);
  }
  return fallback;
}

export function saveToLocalStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch {
    // If quota exceeded due to old snapshots, trim snapshots and retry so user save always succeeds
    try {
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (retryErr) {
      console.warn(`Failed writing localStorage key "${key}"`, retryErr);
    }
  }
  // Mirror every save into IndexedDB asynchronously for Android WebView durability
  saveToIndexedDB(key, value).catch(() => {});
}

// --- Server API Sync with Debouncing & Atomic File Persistence ---
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function computeDataSignature(data: AppDataPayload): string {
  const gCount = data.goals?.length || 0;
  const tCount = data.tasks?.length || 0;
  const hCount = data.habits?.length || 0;
  const cCount = data.categories?.length || 0;
  const eCount = data.calendarEvents?.length || 0;
  const lastTaskMod = (data.tasks?.[0] as any)?.updatedAt || data.tasks?.[0]?.id || '';
  const lastGoalMod = (data.goals?.[0] as any)?.updatedAt || data.goals?.[0]?.id || '';
  const profileSig = data.userProfile
    ? `${data.userProfile.name || ''}|${data.userProfile.title || ''}|${(data.userProfile.avatarUrl || '').slice(0, 32)}|${data.userProfile.bio || ''}|${data.userProfile.themeColor || ''}|${data.userProfile.darkModePreference || ''}`
    : '';
  const remSig = data.reminderSettings
    ? `${data.reminderSettings.enabled}:${data.reminderSettings.soundEnabled}:${data.reminderSettings.selectedSoundId}:${data.reminderSettings.volume}:${data.reminderSettings.snoozeIntervalMinutes}`
    : '';
  return `${gCount}:${tCount}:${hCount}:${cCount}:${eCount}:${lastTaskMod}:${lastGoalMod}:${profileSig}:${remSig}`;
}

// Immediate flush to disk persistence outside /public or /dist
export async function saveServerDataImmediate(data: AppDataPayload): Promise<boolean> {
  // Skip network call in file:// Android APK WebView
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return false;
  }

  const hasContent =
    (data.goals && data.goals.length > 0) ||
    (data.tasks && data.tasks.length > 0) ||
    (data.habits && data.habits.length > 0) ||
    (data.calendarEvents && data.calendarEvents.length > 0) ||
    (data.categories && data.categories.length > 0) ||
    Boolean(data.userProfile?.name);
  if (!hasContent) return false;

  try {
    const userId = getOrCreateUserId();
    const payload = {
      ...data,
      appPreferences: data.appPreferences || collectCurrentAppPreferences(data.userProfile),
      userId,
      initialized: true,
      lastUpdated: Date.now(),
    };
    const bodyStr = JSON.stringify(payload);

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      document.visibilityState === 'hidden'
    ) {
      const blob = new Blob([bodyStr], { type: 'application/json; charset=utf-8' });
      navigator.sendBeacon('/api/data', blob);
      return true;
    }

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-User-Id': userId,
      },
      keepalive: true,
      body: bodyStr,
    });
    if (res.ok) {
      saveToLocalStorage(STORAGE_KEYS.LAST_SYNC, Date.now());
      return true;
    }
  } catch (err) {
    console.warn('[Storage] Immediate server save notice:', err);
  }
  return false;
}

export function triggerServerSync(data: AppDataPayload, delayMs: number = 600): void {
  const hasContent =
    (data.goals && data.goals.length > 0) ||
    (data.tasks && data.tasks.length > 0) ||
    (data.habits && data.habits.length > 0) ||
    (data.calendarEvents && data.calendarEvents.length > 0) ||
    Boolean(data.userProfile?.name);
  if (!hasContent) {
    return;
  }

  // Always create snapshot locally immediately
  saveLocalSnapshot(data);

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    await saveServerDataImmediate(data);
  }, delayMs);
}

// Robust Periodic Persistence Service: Saves to dedicated data/ directory outside public/dist
export function startPeriodicPersistence(
  getData: () => AppDataPayload,
  intervalMs: number = 15000
): () => void {
  if (typeof window === 'undefined') return () => {};

  let lastSignature = '';

  const performCheckAndSave = () => {
    try {
      const currentData = getData();
      if (!currentData) return;

      const hasContent =
        (currentData.goals && currentData.goals.length > 0) ||
        (currentData.tasks && currentData.tasks.length > 0) ||
        (currentData.habits && currentData.habits.length > 0) ||
        (currentData.calendarEvents && currentData.calendarEvents.length > 0) ||
        Boolean(currentData.userProfile?.name);
      if (!hasContent) return;

      const signature = computeDataSignature(currentData);
      if (signature !== lastSignature) {
        lastSignature = signature;
        saveLocalSnapshot(currentData);
        saveServerDataImmediate(currentData);
      }
    } catch (e) {
      console.warn('[Periodic Persistence Error]:', e);
    }
  };

  const timerId = setInterval(performCheckAndSave, intervalMs);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      performCheckAndSave();
    }
  };

  const handleBeforeUnload = () => {
    performCheckAndSave();
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handleBeforeUnload);

  return () => {
    clearInterval(timerId);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handleBeforeUnload);
  };
}

// Fetch from server API with fast timeout for resilient real-world hydration
export async function fetchServerData(): Promise<AppDataPayload | null> {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return null;
  }
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

    const userId = getOrCreateUserId();
    const res = await fetch(`/api/data?userId=${encodeURIComponent(userId)}`, {
      signal: controller ? controller.signal : undefined,
      headers: {
        'X-User-Id': userId,
      },
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        const hasContent =
          (Array.isArray(data.goals) && data.goals.length > 0) ||
          (Array.isArray(data.tasks) && data.tasks.length > 0) ||
          (Array.isArray(data.habits) && data.habits.length > 0) ||
          (Array.isArray(data.calendarEvents) && data.calendarEvents.length > 0) ||
          (Array.isArray(data.categories) && data.categories.length > 0);
        if (hasContent) {
          return data as AppDataPayload;
        }
      }
    }
  } catch {
    console.info('Server storage API not accessible or offline, using local storage.');
  }
  return null;
}

// Fetch available snapshots from the persistent server directory
export async function fetchServerSnapshots(): Promise<
  Array<{ filename: string; timestamp: number; size: number }>
> {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return [];
  }
  try {
    const res = await fetch('/api/snapshots');
    if (res.ok) {
      const data = await res.json();
      return data?.snapshots || [];
    }
  } catch {}
  return [];
}

// Safe Pre-Update Storage Check and Emergency Snapshot
export interface PreUpdateBackupResult {
  success: boolean;
  timestamp: number;
  data: AppDataPayload;
  downloadedFile?: boolean;
}

export function savePreUpdateBackup(data: AppDataPayload): PreUpdateBackupResult {
  const timestamp = Date.now();
  saveLocalSnapshot(data);
  try {
    localStorage.setItem(
      STORAGE_KEYS.PRE_UPDATE_BACKUP,
      JSON.stringify({
        timestamp,
        data,
      })
    );
    saveToIndexedDB(STORAGE_KEYS.PRE_UPDATE_BACKUP, { timestamp, data }).catch(() => {});
  } catch (e) {
    console.warn('Could not save pre-update backup to localStorage:', e);
  }
  return {
    success: true,
    timestamp,
    data,
  };
}

export function getPreUpdateBackup(): { timestamp: number; data: AppDataPayload } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRE_UPDATE_BACKUP);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export interface UpgradeCheckResult {
  isUpgrade: boolean;
  isFirstInstall: boolean;
  fromVersion?: string;
  fromVersionCode?: number;
  toVersion: string;
  toVersionCode: number;
  backupCreated: boolean;
}

export interface VersionArchiveItem {
  version: string;
  versionCode: number;
  timestamp: number;
  backupData: AppDataPayload;
}

// Automatically runs on app launch: guards all data across APK & Web upgrades without ever clearing user data
export function checkAndPerformVersionUpgradeMigration(
  currentData: AppDataPayload,
  currentVersion: string,
  currentVersionCode: number
): UpgradeCheckResult {
  if (typeof window === 'undefined') {
    return {
      isUpgrade: false,
      isFirstInstall: false,
      toVersion: currentVersion,
      toVersionCode: currentVersionCode,
      backupCreated: false,
    };
  }

  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    const storedCodeRaw = localStorage.getItem('javaneh_version_code');
    const storedVersionCode = storedCodeRaw ? parseInt(storedCodeRaw, 10) : null;

    // First ever run
    if (!storedVersion && !storedVersionCode) {
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, currentVersion);
      localStorage.setItem('javaneh_version_code', String(currentVersionCode));
      saveLocalSnapshot(currentData);
      return {
        isUpgrade: false,
        isFirstInstall: true,
        toVersion: currentVersion,
        toVersionCode: currentVersionCode,
        backupCreated: true,
      };
    }

    // Detected an app upgrade (e.g. from v2.3.0 to v2.4.0)
    if (
      storedVersion !== currentVersion ||
      (storedVersionCode !== null && storedVersionCode < currentVersionCode)
    ) {
      const prevVer = storedVersion || '2.3.0';
      const prevCode = storedVersionCode || 230;

      // 1. Immutable safety snapshot of the previous state
      savePreUpdateBackup(currentData);
      saveLocalSnapshot(currentData);

      // 2. Save version archive into upgrade history
      try {
        const historyRaw = localStorage.getItem('javaneh_upgrade_history');
        let history: VersionArchiveItem[] = historyRaw ? JSON.parse(historyRaw) : [];
        history.unshift({
          version: prevVer,
          versionCode: prevCode,
          timestamp: Date.now(),
          backupData: currentData,
        });
        // Keep last 4 version archives
        history = history.slice(0, 4);
        localStorage.setItem('javaneh_upgrade_history', JSON.stringify(history));
        saveToIndexedDB('javaneh_upgrade_history', history).catch(() => {});
      } catch (err) {
        console.warn('Upgrade history archive notice:', err);
      }

      // 3. Update version registers
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, currentVersion);
      localStorage.setItem('javaneh_version_code', String(currentVersionCode));
      localStorage.setItem('javaneh_last_upgrade_time', String(Date.now()));

      return {
        isUpgrade: true,
        isFirstInstall: false,
        fromVersion: prevVer,
        fromVersionCode: prevCode,
        toVersion: currentVersion,
        toVersionCode: currentVersionCode,
        backupCreated: true,
      };
    }
  } catch (e) {
    console.warn('Version upgrade migration check warning:', e);
  }

  return {
    isUpgrade: false,
    isFirstInstall: false,
    toVersion: currentVersion,
    toVersionCode: currentVersionCode,
    backupCreated: false,
  };
}

export function getVersionUpgradeHistory(): VersionArchiveItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('javaneh_upgrade_history');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
