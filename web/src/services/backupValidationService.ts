import {
  AppTask,
  Goal,
  Habit,
  Category,
  UserProfile,
  ReminderSettings,
  CalendarEvent,
  AppPreferences,
  GoalPeriod,
  GoalStatus,
  TaskRepeatType,
  HabitFrequency,
  DarkModePreference,
} from '../types';
import { getTodayJalali, jalaliToFormattedString } from '../calendar/jalali';
import { calculateBackupChecksum } from './storageService';

export interface ValidationEntityCounts {
  categories: number;
  goals: number;
  tasks: number;
  habits: number;
  calendarEvents: number;
  hasUserProfile?: boolean;
  hasReminderSettings?: boolean;
  hasAppPreferences?: boolean;
  corruptedTasks: number;
  corruptedGoals: number;
  corruptedHabits: number;
  corruptedCategories: number;
}

export interface ValidatedBackupResult {
  isValid: boolean;
  fatalError: string | null;
  warnings: string[];
  counts: ValidationEntityCounts;
  exportDateString?: string;
  appName?: string;
  checksum?: string;
  checksumVerified?: boolean;
  data: {
    categories: Category[];
    goals: Goal[];
    tasks: AppTask[];
    habits: Habit[];
    calendarEvents: CalendarEvent[];
    userProfile?: UserProfile;
    reminderSettings?: ReminderSettings;
    appPreferences?: AppPreferences;
  } | null;
}

/**
 * Validates and sanitizes a raw JSON string from a backup file or pasted text.
 * Preserves 100% of fields across Tasks, Goals, Habits, Categories, CalendarEvents,
 * UserProfile (including uploaded avatar image), ReminderSettings (including custom sounds),
 * and AppPreferences (theme, dark mode schedule, animations, haptics, GitHub sync).
 * Also automatically upgrades legacy backup schemas.
 */
export function validateAndSanitizeBackupJson(rawJson: string): ValidatedBackupResult {
  const emptyCounts: ValidationEntityCounts = {
    categories: 0,
    goals: 0,
    tasks: 0,
    habits: 0,
    calendarEvents: 0,
    corruptedTasks: 0,
    corruptedGoals: 0,
    corruptedHabits: 0,
    corruptedCategories: 0,
  };

  if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
    return {
      isValid: false,
      fatalError: 'فایل یا متن انتخابی خالی است. لطفاً یک فایل معتبر پشتیبان را انتخاب کنید.',
      warnings: [],
      counts: emptyCounts,
      data: null,
    };
  }

  // 1. Clean encoding artifacts (UTF-8 BOM, markdown code fences, zero-width spaces)
  let cleaned = rawJson
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // 2. Syntactic JSON Parse check with resilient fallback
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      const sanitizedCommas = cleaned.replace(/,\s*([\]}])/g, '$1');
      parsed = JSON.parse(sanitizedCommas);
    } catch {
      return {
        isValid: false,
        fatalError: 'خطای ساختاری در متن فایل JSON. لطفاً مطمئن شوید فایل بدون آسیب دانلود شده و دارای فرمت صحیح است.',
        warnings: [],
        counts: emptyCounts,
        data: null,
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      fatalError: 'ساختار ریشه فایل نامعتبر است. داده‌ها باید به صورت شیء (Object) استاندارد باشند.',
      warnings: [],
      counts: emptyCounts,
      data: null,
    };
  }

  // Support direct array of tasks (Task-only backup format)
  if (Array.isArray(parsed)) {
    return validateDirectTasksArray(parsed);
  }

  // Unwrap nested root if wrapped in data/backup/payload/javaneh/state
  const root =
    parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? { ...parsed, ...parsed.data }
      : parsed.backup && typeof parsed.backup === 'object' && !Array.isArray(parsed.backup)
      ? { ...parsed, ...parsed.backup }
      : parsed.payload && typeof parsed.payload === 'object' && !Array.isArray(parsed.payload)
      ? { ...parsed, ...parsed.payload }
      : parsed.javaneh && typeof parsed.javaneh === 'object' && !Array.isArray(parsed.javaneh)
      ? { ...parsed, ...parsed.javaneh }
      : parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)
      ? { ...parsed, ...parsed.state }
      : parsed;

  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);

  const warnings: string[] = [];
  let corruptedTasks = 0;
  let corruptedGoals = 0;
  let corruptedHabits = 0;
  let corruptedCategories = 0;

  // 3. Complete Tasks Validation & Preservation (preserves all fields, focusSessions, goalId, repeat rules, archive/transfer flags)
  const validTasks: AppTask[] = [];
  const rawTasks = Array.isArray(root.tasks) ? root.tasks : [];
  for (const item of rawTasks) {
    if (
      item &&
      typeof item === 'object' &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      String(item.id).trim() &&
      typeof item.title === 'string' &&
      item.title.trim()
    ) {
      const validRepeat: TaskRepeatType =
        item.repeatType === 'DAILY' ||
        item.repeatType === 'WEEKLY' ||
        item.repeatType === 'MONTHLY' ||
        item.repeatType === 'NONE'
          ? item.repeatType
          : 'NONE';

      validTasks.push({
        ...item,
        id: String(item.id).trim(),
        title: String(item.title).trim(),
        notes: typeof item.notes === 'string' ? item.notes : '',
        categoryId:
          typeof item.categoryId === 'string' && item.categoryId.trim()
            ? item.categoryId.trim()
            : 'cat-work',
        goalId: item.goalId !== undefined ? item.goalId : null,
        startDate: typeof item.startDate === 'string' ? item.startDate : null,
        dueDate: typeof item.dueDate === 'string' ? item.dueDate : '',
        time: typeof item.time === 'string' ? item.time : null,
        deadlineTime: typeof item.deadlineTime === 'string' ? item.deadlineTime : null,
        reminderMinutesBefore:
          typeof item.reminderMinutesBefore === 'number' ? item.reminderMinutesBefore : null,
        isImportant: Boolean(item.isImportant),
        reminderEnabled: Boolean(item.reminderEnabled),
        reminderTime: typeof item.reminderTime === 'string' ? item.reminderTime : null,
        reminderDate: typeof item.reminderDate === 'string' ? item.reminderDate : null,
        customAlarmSound:
          typeof item.customAlarmSound === 'string' ? item.customAlarmSound : null,
        lastNotifiedAt: typeof item.lastNotifiedAt === 'string' ? item.lastNotifiedAt : null,
        snoozeCount: typeof item.snoozeCount === 'number' ? item.snoozeCount : 0,
        nextSnoozeAt: typeof item.nextSnoozeAt === 'string' ? item.nextSnoozeAt : null,
        repeatType: validRepeat,
        repeatDaysOfWeek: Array.isArray(item.repeatDaysOfWeek)
          ? item.repeatDaysOfWeek.filter((d: any) => typeof d === 'number')
          : [],
        monthOfYear: typeof item.monthOfYear === 'number' ? item.monthOfYear : null,
        weekOfMonth: typeof item.weekOfMonth === 'number' ? item.weekOfMonth : null,
        dayOfWeek: typeof item.dayOfWeek === 'number' ? item.dayOfWeek : null,
        timerSecondsTarget:
          typeof item.timerSecondsTarget === 'number' && item.timerSecondsTarget > 0
            ? item.timerSecondsTarget
            : 1500,
        timerSecondsElapsed:
          typeof item.timerSecondsElapsed === 'number' ? item.timerSecondsElapsed : 0,
        focusProgressPercent:
          typeof item.focusProgressPercent === 'number' ? item.focusProgressPercent : 0,
        focusSessions: Array.isArray(item.focusSessions) ? item.focusSessions : [],
        isCompleted: Boolean(item.isCompleted),
        completedAt: typeof item.completedAt === 'string' ? item.completedAt : null,
        isArchived: Boolean(item.isArchived),
        isTransferredToNextSeason: Boolean(item.isTransferredToNextSeason),
        transferredToGoalId:
          typeof item.transferredToGoalId === 'string' ? item.transferredToGoalId : null,
        transferredToSeasonIndex:
          typeof item.transferredToSeasonIndex === 'number' ? item.transferredToSeasonIndex : null,
        originSeasonalTaskId:
          typeof item.originSeasonalTaskId === 'string' ? item.originSeasonalTaskId : null,
      });
    } else {
      corruptedTasks++;
    }
  }

  // 4. Complete Goals Validation & Preservation (preserves period, seasonIndex, monthIndex, parentId, manualProgress, history, etc.)
  const validGoals: Goal[] = [];
  const rawGoals = Array.isArray(root.goals) ? root.goals : [];
  for (const item of rawGoals) {
    if (
      item &&
      typeof item === 'object' &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      String(item.id).trim() &&
      typeof item.title === 'string' &&
      item.title.trim()
    ) {
      // Support both current 'period' and legacy 'timeframe'
      let period: GoalPeriod = 'ANNUAL';
      if (item.period === 'ANNUAL' || item.period === 'SEASONAL' || item.period === 'MONTHLY') {
        period = item.period;
      } else if (item.timeframe === 'SEASON') {
        period = 'SEASONAL';
      } else if (item.timeframe === 'MONTH') {
        period = 'MONTHLY';
      } else if (typeof item.monthIndex === 'number' || typeof item.monthNumber === 'number') {
        period = 'MONTHLY';
      } else if (typeof item.seasonIndex === 'number' || typeof item.seasonNumber === 'number') {
        period = 'SEASONAL';
      }

      // Support both current GoalStatus and legacy 'ACTIVE' / 'ARCHIVED'
      let status: GoalStatus = 'IN_PROGRESS';
      if (
        item.status === 'NOT_STARTED' ||
        item.status === 'IN_PROGRESS' ||
        item.status === 'COMPLETED' ||
        item.status === 'PAUSED'
      ) {
        status = item.status;
      } else if (item.status === 'ACTIVE') {
        status = 'IN_PROGRESS';
      } else if (item.status === 'ARCHIVED') {
        status = 'PAUSED';
      }

      const parsedYear =
        typeof item.year === 'number' && !isNaN(item.year)
          ? item.year
          : typeof item.year === 'string' && !isNaN(parseInt(item.year, 10))
          ? parseInt(item.year, 10)
          : today.year;

      const seasonIdx =
        typeof item.seasonIndex === 'number'
          ? item.seasonIndex
          : typeof item.seasonNumber === 'number'
          ? item.seasonNumber
          : undefined;

      const monthIdx =
        typeof item.monthIndex === 'number'
          ? item.monthIndex
          : typeof item.monthNumber === 'number'
          ? item.monthNumber
          : undefined;

      const manualProg =
        typeof item.manualProgress === 'number'
          ? item.manualProgress
          : typeof item.progress === 'number'
          ? item.progress
          : null;

      validGoals.push({
        ...item,
        id: String(item.id).trim(),
        title: String(item.title).trim(),
        description:
          typeof item.description === 'string'
            ? item.description
            : typeof item.notes === 'string'
            ? item.notes
            : '',
        visionWhy: typeof item.visionWhy === 'string' ? item.visionWhy : undefined,
        year: parsedYear,
        period,
        status,
        startDate: typeof item.startDate === 'string' && item.startDate ? item.startDate : todayStr,
        targetDate: typeof item.targetDate === 'string' ? item.targetDate : undefined,
        seasonIndex: seasonIdx,
        monthIndex: monthIdx,
        parentId: item.parentId ? String(item.parentId) : null,
        categoryId:
          typeof item.categoryId === 'string' && item.categoryId.trim()
            ? item.categoryId.trim()
            : 'cat-work',
        colorHex: typeof item.colorHex === 'string' ? item.colorHex : undefined,
        plantType: typeof item.plantType === 'string' && item.plantType ? item.plantType : 'بونسای',
        manualProgress: manualProg,
        isManualProgressActive:
          typeof item.isManualProgressActive === 'boolean'
            ? item.isManualProgressActive
            : typeof manualProg === 'number' && manualProg > 0,
        continuesGoalId: item.continuesGoalId ? String(item.continuesGoalId) : null,
        originTaskId: item.originTaskId ? String(item.originTaskId) : null,
        history: Array.isArray(item.history) ? item.history : [],
        createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : todayStr,
      });
    } else {
      corruptedGoals++;
    }
  }

  // 5. Complete Habits Validation & Preservation (preserves frequency, timerMinutes, plantType, completionHistory, dailyProgressHistory, etc.)
  const validHabits: Habit[] = [];
  const rawHabits = Array.isArray(root.habits) ? root.habits : [];
  for (const item of rawHabits) {
    if (
      item &&
      typeof item === 'object' &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      String(item.id).trim() &&
      typeof item.title === 'string' &&
      item.title.trim()
    ) {
      const freq: HabitFrequency =
        item.frequency === 'WEEKLY' || item.frequency === 'DAILY' ? item.frequency : 'DAILY';

      validHabits.push({
        ...item,
        id: String(item.id).trim(),
        title: String(item.title).trim(),
        notes: typeof item.notes === 'string' ? item.notes : '',
        categoryId:
          typeof item.categoryId === 'string' && item.categoryId.trim()
            ? item.categoryId.trim()
            : 'cat-work',
        goalId: item.goalId ? String(item.goalId) : null,
        time: typeof item.time === 'string' ? item.time : '08:00',
        timerMinutes:
          typeof item.timerMinutes === 'number' && item.timerMinutes > 0 ? item.timerMinutes : 15,
        frequency: freq,
        targetDaysOfWeek: Array.isArray(item.targetDaysOfWeek)
          ? item.targetDaysOfWeek.filter((d: any) => typeof d === 'number')
          : [0, 1, 2, 3, 4, 5, 6],
        exemptHolidays: Boolean(item.exemptHolidays),
        exemptWeekends: Boolean(item.exemptWeekends),
        plantType: typeof item.plantType === 'string' && item.plantType ? item.plantType : 'بونسای',
        completionHistory:
          item.completionHistory && typeof item.completionHistory === 'object'
            ? item.completionHistory
            : {},
        dailyProgressHistory:
          item.dailyProgressHistory && typeof item.dailyProgressHistory === 'object'
            ? item.dailyProgressHistory
            : {},
        dailyElapsedSeconds:
          item.dailyElapsedSeconds && typeof item.dailyElapsedSeconds === 'object'
            ? item.dailyElapsedSeconds
            : {},
        focusSessions: Array.isArray(item.focusSessions) ? item.focusSessions : [],
        createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : todayStr,
        isClosed: Boolean(item.isClosed),
        closedAt: typeof item.closedAt === 'string' ? item.closedAt : null,
      });
    } else {
      corruptedHabits++;
    }
  }

  // 6. Complete Categories Validation
  const validCategories: Category[] = [];
  const rawCats = Array.isArray(root.categories) ? root.categories : [];
  for (const item of rawCats) {
    if (
      item &&
      typeof item === 'object' &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      String(item.id).trim() &&
      typeof item.title === 'string' &&
      item.title.trim()
    ) {
      validCategories.push({
        ...item,
        id: String(item.id).trim(),
        title: String(item.title).trim(),
        colorHex:
          typeof item.colorHex === 'string' && item.colorHex.startsWith('#')
            ? item.colorHex
            : '#10B981',
        iconName: typeof item.iconName === 'string' && item.iconName ? item.iconName : 'Briefcase',
        plantType: typeof item.plantType === 'string' && item.plantType ? item.plantType : 'بونسای',
      });
    } else {
      corruptedCategories++;
    }
  }

  // 7. Complete Calendar Events Validation (preserves reminderDays, reminderTimes, repeatYearly, etc.)
  const rawCalendarEvents = Array.isArray(root.calendarEvents)
    ? root.calendarEvents
    : Array.isArray(parsed.calendarEvents)
    ? parsed.calendarEvents
    : [];
  const validCalendarEvents: CalendarEvent[] = [];
  for (const item of rawCalendarEvents) {
    if (item && typeof item === 'object' && item.id && item.title && item.date) {
      validCalendarEvents.push({
        ...item,
        id: String(item.id).trim(),
        title: String(item.title).trim(),
        type: item.type || 'BIRTHDAY',
        date: String(item.date),
        time: item.time ? String(item.time) : null,
        description: item.description ? String(item.description) : undefined,
        colorHex: item.colorHex || '#10B981',
        hasReminder: item.hasReminder !== false,
        reminderMinutesBefore:
          typeof item.reminderMinutesBefore === 'number' ? item.reminderMinutesBefore : 15,
        reminderDays: Array.isArray(item.reminderDays)
          ? item.reminderDays.filter((d: any) => typeof d === 'number')
          : [0],
        reminderTimes: Array.isArray(item.reminderTimes)
          ? item.reminderTimes.filter((t: any) => typeof t === 'string')
          : item.time
          ? [String(item.time)]
          : ['09:00'],
        repeatYearly: item.repeatYearly ?? item.type === 'BIRTHDAY',
        notified: Boolean(item.notified),
        createdAt: item.createdAt || todayStr,
      });
    }
  }

  // 8. Complete User Profile Validation (preserves avatarUrl Base64 image, themeColor, darkModePreference, darkModeSchedule)
  let validUserProfile: UserProfile | undefined = undefined;
  const rawProfile = root.userProfile || parsed.userProfile;
  if (rawProfile && typeof rawProfile === 'object') {
    const validPref: DarkModePreference | undefined =
      rawProfile.darkModePreference === 'LIGHT' ||
      rawProfile.darkModePreference === 'DARK' ||
      rawProfile.darkModePreference === 'SYSTEM' ||
      rawProfile.darkModePreference === 'SCHEDULE'
        ? rawProfile.darkModePreference
        : undefined;

    validUserProfile = {
      ...rawProfile,
      name:
        typeof rawProfile.name === 'string' && rawProfile.name.trim()
          ? rawProfile.name.trim()
          : 'باغبان جوانه',
      title: typeof rawProfile.title === 'string' ? rawProfile.title : '',
      avatarUrl: typeof rawProfile.avatarUrl === 'string' && rawProfile.avatarUrl ? rawProfile.avatarUrl : '🌱',
      bio: typeof rawProfile.bio === 'string' ? rawProfile.bio : '',
      themeColor: typeof rawProfile.themeColor === 'string' ? rawProfile.themeColor : undefined,
      darkMode: typeof rawProfile.darkMode === 'boolean' ? rawProfile.darkMode : undefined,
      darkModePreference: validPref,
      darkModeSchedule:
        rawProfile.darkModeSchedule && typeof rawProfile.darkModeSchedule === 'object'
          ? {
              start: String(rawProfile.darkModeSchedule.start || '20:00'),
              end: String(rawProfile.darkModeSchedule.end || '06:30'),
            }
          : undefined,
    };
  }

  // 9. Complete Reminder Settings Validation (preserves customSounds & all intervals)
  let validReminderSettings: ReminderSettings | undefined = undefined;
  const rawRem = root.reminderSettings || parsed.reminderSettings;
  if (rawRem && typeof rawRem === 'object') {
    validReminderSettings = {
      ...rawRem,
      enabled: typeof rawRem.enabled === 'boolean' ? rawRem.enabled : true,
      soundEnabled: typeof rawRem.soundEnabled === 'boolean' ? rawRem.soundEnabled : true,
      selectedSoundId:
        typeof rawRem.selectedSoundId === 'string' ? rawRem.selectedSoundId : 'serenity',
      volume: typeof rawRem.volume === 'number' ? rawRem.volume : 0.8,
      customSounds: Array.isArray(rawRem.customSounds) ? rawRem.customSounds : [],
      snoozeIntervalMinutes:
        typeof rawRem.snoozeIntervalMinutes === 'number' ? rawRem.snoozeIntervalMinutes : 10,
      availableSnoozeIntervals: Array.isArray(rawRem.availableSnoozeIntervals)
        ? rawRem.availableSnoozeIntervals
        : [5, 10, 15, 30, 60],
      autoReNotifyCount:
        typeof rawRem.autoReNotifyCount === 'number' ? rawRem.autoReNotifyCount : 2,
      autoReNotifyIntervalMinutes:
        typeof rawRem.autoReNotifyIntervalMinutes === 'number'
          ? rawRem.autoReNotifyIntervalMinutes
          : 10,
      notifyBeforeHolidayTasks:
        typeof rawRem.notifyBeforeHolidayTasks === 'boolean'
          ? rawRem.notifyBeforeHolidayTasks
          : true,
      holidayLeadMinutes:
        typeof rawRem.holidayLeadMinutes === 'number' ? rawRem.holidayLeadMinutes : 15,
    };
  }

  // 10. Complete App Preferences Validation
  let validAppPreferences: AppPreferences | undefined = undefined;
  const rawPrefs = root.appPreferences || parsed.appPreferences;
  if (rawPrefs && typeof rawPrefs === 'object') {
    validAppPreferences = {
      themeColor: typeof rawPrefs.themeColor === 'string' ? rawPrefs.themeColor : undefined,
      darkMode: typeof rawPrefs.darkMode === 'boolean' ? rawPrefs.darkMode : undefined,
      darkModePreference: rawPrefs.darkModePreference,
      darkModeSchedule: rawPrefs.darkModeSchedule,
      enablePlantAnimations:
        typeof rawPrefs.enablePlantAnimations === 'boolean'
          ? rawPrefs.enablePlantAnimations
          : undefined,
      enableHapticFeedback:
        typeof rawPrefs.enableHapticFeedback === 'boolean'
          ? rawPrefs.enableHapticFeedback
          : undefined,
      githubSyncConfig: rawPrefs.githubSyncConfig || null,
    };
  }

  // Safety Check: Does this file have ANY valid entities?
  const totalValidItems =
    validTasks.length +
    validGoals.length +
    validHabits.length +
    validCategories.length +
    validCalendarEvents.length;

  if (totalValidItems === 0 && !validUserProfile && !validReminderSettings && !validAppPreferences) {
    return {
      isValid: false,
      fatalError:
        'هیچ داده معتبری (تسک، هدف، عادت، رویداد، دسته یا پروفایل) در این فایل یافت نشد. جهت جلوگیری از پاک شدن اطلاعات فعلی شما، بارگذاری متوقف شد.',
      warnings: [],
      counts: {
        categories: 0,
        goals: 0,
        tasks: 0,
        habits: 0,
        calendarEvents: 0,
        corruptedTasks,
        corruptedGoals,
        corruptedHabits,
        corruptedCategories,
      },
      data: null,
    };
  }

  if (corruptedTasks > 0) {
    warnings.push(`${corruptedTasks} تسک ناقص (فاقد عنوان یا شناسه) نادیده گرفته شد.`);
  }
  if (corruptedGoals > 0) {
    warnings.push(`${corruptedGoals} هدف با ساختار نامعتبر نادیده گرفته شد.`);
  }
  if (corruptedHabits > 0) {
    warnings.push(`${corruptedHabits} عادت با فیلدهای ناقص نادیده گرفته شد.`);
  }
  if (corruptedCategories > 0) {
    warnings.push(`${corruptedCategories} دسته‌بندی مخدوش نادیده گرفته شد.`);
  }

  const exportDateString =
    parsed.exportPersianDate ||
    root.exportPersianDate ||
    (parsed.exportDate ? new Date(parsed.exportDate).toLocaleDateString('fa-IR') : undefined);
  const appName = typeof parsed.appName === 'string' ? parsed.appName : 'جوانه';

  // Checksum verification
  let checksumVerified: boolean | undefined = undefined;
  const rawChecksum = parsed.checksum || root.checksum;
  if (typeof rawChecksum === 'string' && rawChecksum.trim()) {
    const computed = calculateBackupChecksum({
      categories: validCategories,
      goals: validGoals,
      tasks: validTasks,
      habits: validHabits,
      calendarEvents: validCalendarEvents,
    });
    checksumVerified = computed === rawChecksum.trim();
    if (checksumVerified) {
      warnings.unshift('یکپارچگی و سلامت ساختاری فایل (Checksum) با موفقیت تأیید شد ✓');
    } else {
      warnings.push('هشدار: هش فایل پشتیبان تفاوت دارد؛ داده‌های سالم به‌صورت جداگانه اعتبارسنجی شدند.');
    }
  }

  return {
    isValid: true,
    fatalError: null,
    warnings,
    exportDateString,
    appName,
    checksum: rawChecksum,
    checksumVerified,
    counts: {
      categories: validCategories.length,
      goals: validGoals.length,
      tasks: validTasks.length,
      habits: validHabits.length,
      calendarEvents: validCalendarEvents.length,
      hasUserProfile: Boolean(validUserProfile),
      hasReminderSettings: Boolean(validReminderSettings),
      hasAppPreferences: Boolean(validAppPreferences),
      corruptedTasks,
      corruptedGoals,
      corruptedHabits,
      corruptedCategories,
    },
    data: {
      categories: validCategories,
      goals: validGoals,
      tasks: validTasks,
      habits: validHabits,
      calendarEvents: validCalendarEvents,
      userProfile: validUserProfile,
      reminderSettings: validReminderSettings,
      appPreferences: validAppPreferences,
    },
  };
}

/**
 * Direct array of tasks validation (e.g. for legacy task-only exports)
 */
function validateDirectTasksArray(arr: any[]): ValidatedBackupResult {
  const validTasks: AppTask[] = [];
  let corrupted = 0;

  for (const item of arr) {
    if (item && typeof item === 'object' && (typeof item.id === 'string' || typeof item.id === 'number') && item.title) {
      validTasks.push({
        ...item,
        id: String(item.id),
        title: String(item.title),
        notes: typeof item.notes === 'string' ? item.notes : '',
        isCompleted: Boolean(item.isCompleted),
        categoryId: typeof item.categoryId === 'string' ? item.categoryId : 'cat-work',
        dueDate: typeof item.dueDate === 'string' ? item.dueDate : '',
        time: typeof item.time === 'string' ? item.time : null,
        repeatType:
          item.repeatType === 'DAILY' ||
          item.repeatType === 'WEEKLY' ||
          item.repeatType === 'MONTHLY' ||
          item.repeatType === 'NONE'
            ? item.repeatType
            : 'NONE',
        repeatDaysOfWeek: Array.isArray(item.repeatDaysOfWeek) ? item.repeatDaysOfWeek : [],
        timerSecondsTarget: typeof item.timerSecondsTarget === 'number' ? item.timerSecondsTarget : 1500,
        timerSecondsElapsed: typeof item.timerSecondsElapsed === 'number' ? item.timerSecondsElapsed : 0,
      });
    } else {
      corrupted++;
    }
  }

  if (validTasks.length === 0) {
    return {
      isValid: false,
      fatalError: 'فایل حاوی هیچ تسک معتبری نیست. اطلاعات فعلی شما بدون تغییر حفظ گردید.',
      warnings: [],
      counts: {
        categories: 0,
        goals: 0,
        tasks: 0,
        habits: 0,
        calendarEvents: 0,
        corruptedTasks: corrupted,
        corruptedGoals: 0,
        corruptedHabits: 0,
        corruptedCategories: 0,
      },
      data: null,
    };
  }

  return {
    isValid: true,
    fatalError: null,
    warnings: corrupted > 0 ? [`${corrupted} تسک ناقص در فایل نادیده گرفته شد.`] : [],
    counts: {
      categories: 0,
      goals: 0,
      tasks: validTasks.length,
      habits: 0,
      calendarEvents: 0,
      corruptedTasks: corrupted,
      corruptedGoals: 0,
      corruptedHabits: 0,
      corruptedCategories: 0,
    },
    data: {
      categories: [],
      goals: [],
      tasks: validTasks,
      habits: [],
      calendarEvents: [],
    },
  };
}
