export type GoalPeriod = 'ANNUAL' | 'SEASONAL' | 'MONTHLY';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';

export interface GoalHistoryEntry {
  id: string;
  timestamp: string; // e.g. "1403/07/15 - 14:30"
  action: 'CREATED' | 'EDITED' | 'STATUS_CHANGED' | 'NOTE_ADDED' | 'MILESTONE_COMPLETED';
  description: string;
  previousValues?: {
    title?: string;
    description?: string;
    period?: GoalPeriod;
    status?: GoalStatus;
  };
}

export interface Category {
  id: string;
  title: string;
  colorHex: string;
  iconName: string;
  plantType?: string; // نوع گیاه نمادین این دسته‌بندی
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  visionWhy?: string; // چرا این هدف برای شما مهم است؟
  year: number; // e.g. 1403, 1404
  period: GoalPeriod;
  status: GoalStatus;
  startDate: string; // "1403/07/15" - از همین تاریخ به اهداف فعال اضافه می‌شود
  targetDate?: string;
  seasonIndex?: number; // 0: بهار, 1: تابستان, 2: پاییز, 3: زمستان
  monthIndex?: number; // 1 to 12 (فروردین تا اسفند)
  parentId?: string | null;
  categoryId?: string; // دسته‌بندی موضوعی هدف
  colorHex?: string; // رنگ انتخابی هدف یا دسته‌بندی
  plantType?: string; // نوع گیاه نمادین این هدف
  manualProgress?: number | null; // درصد پیشرفت دستی تعیین‌شده توسط کاربر (۰ تا ۱۰۰)
  isManualProgressActive?: boolean; // آیا پیشرفت دستی ملاک است یا محاسبه خودکار
  continuesGoalId?: string | null; // هدف قبلی که این هدف در ادامه آن است (پاییز در ادامه زمستان/تابستان)
  originTaskId?: string | null; // تسکی که این هدف در ادامه یا بر پایه آن تعریف شده
  history: GoalHistoryEntry[];
  createdAt: string;
}

export type TaskRepeatType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface FocusSessionLog {
  id: string;
  dateStr: string; // "1403/07/15"
  timestamp: string; // ISO string
  durationSeconds: number;
  targetSeconds: number;
  completed100: boolean; // whether user marked 100% or timer fully finished
  progressPercent: number; // 0 to 100
}

export interface AppTask {
  id: string;
  title: string;
  notes: string;
  categoryId: string;
  goalId?: string | null;
  startDate?: string | null; // "1403/07/15" - تاریخ شروع یا نمایش تسک (در صورت تعیین، تسک قبل از این تاریخ فعال نمی‌شود)
  dueDate: string; // "1403/07/15" یا خالی برای تسک بدون موعد معین (پیش‌فرض پایان سال)
  time?: string | null; // "14:30" - زمان/ساعت انجام تسک
  deadlineTime?: string | null; // "18:00" - زمان نهایی پایان تسک (اختیاری)
  reminderMinutesBefore?: number | null;
  isImportant?: boolean; // علامت‌گذاری به عنوان تسک مهم
  reminderEnabled?: boolean; // یادآور فعال برای این تسک
  reminderTime?: string | null; // ساعت مشخص یادآور مثلا "14:30"
  reminderDate?: string | null; // تاریخ مشخص یادآور مثلا "1403/07/15"
  customAlarmSound?: string | null; // شناسه زنگ اختصاصی یا پیش‌فرض
  lastNotifiedAt?: string | null; // آخرین زمان ارسال اعلان برای جلوگیری از تکرار
  snoozeCount?: number; // تعداد دفعات تعویق یا یادآوری مجدد
  nextSnoozeAt?: string | null; // زمان یادآوری هوشمند بعدی HH:mm
  repeatType: TaskRepeatType;
  repeatDaysOfWeek: number[]; // 0: Saturday .. 6: Friday
  monthOfYear?: number | null; // 1 to 12 (فروردین تا اسفند) یا خالی (همه ماه‌ها)
  weekOfMonth?: number | null; // 1 to 5 (هفته اول، دوم، سوم، چهارم، پنجم ماه) یا خالی
  dayOfWeek?: number | null; // 0 to 6 (روز شنبه تا جمعه) یا خالی
  timerSecondsTarget: number;
  timerSecondsElapsed: number;
  focusProgressPercent?: number; // 0 to 100 درصد پیشرفت تمرکز روزانه
  focusSessions?: FocusSessionLog[]; // تاریخچه جلسات تمرکز ساعت شنی
  isCompleted: boolean;
  completedAt?: string | null;
  isArchived?: boolean; // آیا به بخش بایگانی منتقل شده است
  isTransferredToNextSeason?: boolean; // آیا به فصل بعدی منتقل شده است
  transferredToGoalId?: string | null; // هدفی که تسک به آن منتقل یا وابسته شده
  transferredToSeasonIndex?: number | null; // شاخص فصل مقصد (۰: بهار، ۱: تابستان، ۲: پاییز، ۳: زمستان)
  originSeasonalTaskId?: string | null; // شناسه تسک مبدأ در صورت انتقال
}

export type HabitFrequency = 'DAILY' | 'WEEKLY';

export interface Habit {
  id: string;
  title: string;
  notes: string;
  categoryId: string;
  goalId?: string | null;
  time?: string | null;
  timerMinutes: number;
  frequency: HabitFrequency;
  targetDaysOfWeek: number[];
  exemptHolidays: boolean;
  exemptWeekends: boolean;
  plantType: string;
  completionHistory: Record<string, boolean>; // "1403/07/15": true
  dailyProgressHistory?: Record<string, number>; // "1403/07/15": 65 (درصد انجام شده از هدف ساعت شنی)
  dailyElapsedSeconds?: Record<string, number>; // "1403/07/15": 900 ثانیه
  focusSessions?: FocusSessionLog[]; // تاریخچه جلسات تمرکز ساعت شنی
  createdAt: string;
  isClosed?: boolean; // آیا عادت خاتمه یافته و از لیست فعال بسته شده است؟ (تاریخچه حفظ می‌شود)
  closedAt?: string | null; // تاریخ بسته شدن
}

export interface PlantState {
  stage: 'SEED' | 'SPROUT' | 'SAPLING' | 'BUDDING' | 'FLOWERING' | 'FULL_BLOOM';
  progressPercent: number;
  completedCount: number;
  totalCount: number;
}

export type DarkModePreference = 'LIGHT' | 'DARK' | 'SYSTEM' | 'SCHEDULE';

export interface DarkModeSchedule {
  start: string; // e.g. "20:00"
  end: string;   // e.g. "06:30"
}

export interface UserProfile {
  name: string;
  title?: string;
  avatarUrl?: string; // تصویر بارگذاری‌شده (Base64) یا آیکون گیاه برگزیده
  bio?: string;
  themeColor?: string; // شناسه تم رنگی برگزیده: emerald, teal, blue, indigo, purple, amber, rose, slate
  darkMode?: boolean;
  darkModePreference?: DarkModePreference;
  darkModeSchedule?: DarkModeSchedule;
}

export interface AlarmSoundItem {
  id: string;
  title: string;
  description: string;
  category: 'calm' | 'nature' | 'chime' | 'zen' | 'custom';
  type: 'synth' | 'audio';
  audioData?: string; // Base64 data URI for user uploaded files
  synthPattern?: string; // For built-in high-res procedural audio
  durationSeconds?: number;
}

export interface ReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  selectedSoundId: string;
  volume: number; // 0.1 to 1.0
  customSounds: AlarmSoundItem[];
  // Smart snooze and local notification intervals
  snoozeIntervalMinutes?: number; // default e.g. 10 minutes
  availableSnoozeIntervals?: number[]; // e.g. [5, 10, 15, 30, 60]
  autoReNotifyCount?: number; // How many times to re-notify if ignored (0 = off, 1, 2, 3)
  autoReNotifyIntervalMinutes?: number; // Interval for auto re-notify e.g. 10 min
  notifyBeforeHolidayTasks?: boolean; // Notify before task starts on official holidays
  holidayLeadMinutes?: number; // Minutes before task to notify on holidays (e.g. 15 or 30 mins)
}

export interface AppPreferences {
  themeColor?: string;
  darkMode?: boolean;
  darkModePreference?: DarkModePreference;
  darkModeSchedule?: DarkModeSchedule;
  enablePlantAnimations?: boolean;
  enableHapticFeedback?: boolean;
  githubSyncConfig?: GitHubSyncConfig | null;
}

export interface AppBackupData {
  appName: string;
  dataType?: string;
  version: string;
  versionCode?: number;
  exportDate: string;
  exportPersianDate?: string;
  userId?: string;
  userProfile?: UserProfile;
  reminderSettings?: ReminderSettings;
  appPreferences?: AppPreferences;
  checksum?: string;
  counts?: {
    categories: number;
    goals: number;
    tasks: number;
    habits: number;
    calendarEvents?: number;
    customSounds?: number;
    hasProfileAvatar?: boolean;
  };
  categories: Category[];
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  calendarEvents?: CalendarEvent[];
}

export type CalendarEventType = 'BIRTHDAY' | 'MEETING' | 'REMINDER' | 'OCCASION' | 'ANNIVERSARY' | 'OTHER';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string; // Jalali date string e.g. "1405/07/28"
  time?: string | null; // e.g. "10:30" (ساعت اصلی رویداد)
  description?: string;
  colorHex?: string;
  hasReminder?: boolean; // آیا یادآور فعال دارد
  reminderMinutesBefore?: number; // legacy fallback (e.g. 15, 30, 60, 1440)
  reminderDays?: number[]; // روزهای ارسال یادآور (تا ۳ روز: 0=همان روز, 1=۱ روز قبل, 2=۲ روز قبل, 3=۳ روز قبل, 7=۱ هفته قبل)
  reminderTimes?: string[]; // ساعت‌های دقیق ارسال یادآور (تا ۳ ساعت مشخص: مثلا ['09:00', '14:30', '20:00'])
  repeatYearly?: boolean; // تکرار سالانه (مناسب برای تولدها و سالگردها)
  notified?: boolean; // آیا اعلان آن ارسال شده است
  createdAt: string;
}

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  personalAccessToken: string;
  lastSyncedAt?: string;
  lastCommitSha?: string;
  lastCommitUrl?: string;
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'IDLE';
  lastSyncError?: string;
}



