import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  AppTask, 
  Habit, 
  Goal, 
  Category, 
  UserProfile, 
  ReminderSettings, 
  PlantState,
  AppBackupData,
  FocusSessionLog,
  GoalStatus,
  CalendarEvent,
  AppPreferences
} from './types';
import { 
  INITIAL_CATEGORIES, 
  getInitialGoals, 
  getInitialTasks, 
  getInitialHabits 
} from './data/initialData';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  WEEKDAYS, 
  isDateHoliday,
  addDaysJalali,
  toLatinDigits,
  getCurrentPersianDateTimeString,
  formatHeaderPersianDate,
  getDayOfWeek,
  PERSIAN_SEASONS
} from './calendar/jalali';
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  STORAGE_KEYS, 
  DEFAULT_USER_PROFILE, 
  DEFAULT_REMINDER_SETTINGS,
  saveLocalSnapshot,
  triggerServerSync,
  saveServerDataImmediate,
  fetchServerData,
  startPeriodicPersistence,
  checkAndPerformVersionUpgradeMigration,
  mergeEntitiesById,
  saveUserProfileImmediate,
  loadUserProfileWithFallback,
  loadEntityListWithFallback,
  hasExistingLocalUserData,
  applyRestoredAppPreferences,
  recoverAllLocalData
} from './services/storageService';
import { 
  setupThemeListeners, 
  getDarkModePreference, 
  getDarkModeSchedule,
  applyDarkMode,
  computeEffectiveDarkMode
} from './services/themeService';
import { 
  playAlarmSound, 
  stopAllAlarmSounds 
} from './services/soundService';
import { 
  sendBrowserNotification, 
  getTaskEffectiveReminderTime,
  isNotificationSupported,
  getNotificationPermission,
  calculateSnoozeTime
} from './services/reminderService';
import { APP_VERSION_INFO } from './version';

// Screens
import { TodayScreen } from './components/TodayScreen';
import { TasksScreen } from './components/TasksScreen';
import { HabitsScreen } from './components/HabitsScreen';
import { GoalsScreen } from './components/GoalsScreen';
import { PersianCalendarScreen } from './components/PersianCalendarScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsScreen } from './components/SettingsScreen';

// Modals
import { TaskModal } from './components/TaskModal';
import { HabitModal } from './components/HabitModal';
import { GoalModal } from './components/GoalModal';
import { AnnualGoalWizardModal } from './components/AnnualGoalWizardModal';
import { GoalDetailHistoryModal } from './components/GoalDetailHistoryModal';
import { TimerModal } from './components/TimerModal';
import { ReminderAlertModal } from './components/ReminderAlertModal';
import { TransferTaskModal } from './components/TransferTaskModal';
import { CalendarEventModal } from './components/CalendarEventModal';
import { ApkDownloadConfirmModal } from './components/ApkDownloadConfirmModal';

// Icons
import { 
  CheckSquare, 
  RotateCw, 
  Target, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings as SettingsIcon,
  Sprout,
  Plus,
  Bell,
  Sun,
  Flame,
  Clock,
  Sparkles,
  Smartphone,
  WifiOff
} from 'lucide-react';
import { PlantIcon } from './components/PlantIcon';

export type MainTab = 'TODAY' | 'TASKS' | 'HABITS' | 'GOALS' | 'CALENDAR' | 'REPORTS' | 'SETTINGS';

export const App: React.FC = () => {
  const today = useMemo(() => getTodayJalali(), []);
  const todayStr = useMemo(() => jalaliToFormattedString(today), [today]);

  // --- Core State Hydration (Preserves existing user data across updates & restarts) ---
  const [categories, setCategories] = useState<Category[]>(() => {
    return loadEntityListWithFallback<Category>(STORAGE_KEYS.CATEGORIES, 'categories', INITIAL_CATEGORIES);
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const fallback = hasExistingLocalUserData() ? [] : getInitialGoals();
    return loadEntityListWithFallback<Goal>(STORAGE_KEYS.GOALS, 'goals', fallback);
  });

  const [tasks, setTasks] = useState<AppTask[]>(() => {
    const fallback = hasExistingLocalUserData() ? [] : getInitialTasks();
    return loadEntityListWithFallback<AppTask>(STORAGE_KEYS.TASKS, 'tasks', fallback);
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const fallback = hasExistingLocalUserData() ? [] : getInitialHabits();
    return loadEntityListWithFallback<Habit>(STORAGE_KEYS.HABITS, 'habits', fallback);
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return loadUserProfileWithFallback();
  });

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => {
    return loadFromLocalStorage<ReminderSettings>(STORAGE_KEYS.REMINDER_SETTINGS, DEFAULT_REMINDER_SETTINGS);
  });

  // Navigation
  const [activeTab, setActiveTab] = useState<MainTab>('TODAY');

  // PWA Install prompt & status
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AppTask | null>(null);
  const [isDuplicateTaskMode, setIsDuplicateTaskMode] = useState(false);

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isDuplicateHabitMode, setIsDuplicateHabitMode] = useState(false);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [isAnnualWizardOpen, setIsAnnualWizardOpen] = useState(false);
  const [selectedHistoryGoal, setSelectedHistoryGoal] = useState<Goal | null>(null);

  const [taskToTransfer, setTaskToTransfer] = useState<AppTask | null>(null);

  // Calendar Events State (تولد، جلسه، یادآوری مستقل تقویم)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    return loadEntityListWithFallback<CalendarEvent>(STORAGE_KEYS.CALENDAR_EVENTS, 'calendarEvents', []);
  });
  const [isCalendarEventModalOpen, setIsCalendarEventModalOpen] = useState(false);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [calendarEventTargetDate, setCalendarEventTargetDate] = useState<string>(todayStr);

  // Timer state
  const [timerState, setTimerState] = useState<{
    isOpen: boolean;
    title: string;
    minutes: number;
    entityType?: 'TASK' | 'HABIT';
    taskId?: string;
    habitId?: string;
    initialElapsedSeconds?: number;
    currentProgressPercent?: number;
    onDone?: (elapsedSeconds: number, isFullyCompleted: boolean) => void;
  }>({
    isOpen: false,
    title: '',
    minutes: 25,
  });

  // Reminder alert popup (supports both Tasks and Calendar Events)
  const [activeAlertTask, setActiveAlertTask] = useState<AppTask | null>(null);
  const [activeAlertCalendarEvent, setActiveAlertCalendarEvent] = useState<CalendarEvent | null>(null);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  // --- Initial Data Hydration: Restore personal user data from IndexedDB/snapshot/server if local state is incomplete ---
  useEffect(() => {
    // 1. Recover from IndexedDB / local snapshot (critical for Android WebView file:// persistence across APK updates)
    recoverAllLocalData().then(localRecovered => {
      if (localRecovered) {
        if (Array.isArray(localRecovered.categories) && localRecovered.categories.length > 0) {
          setCategories(prev => mergeEntitiesById(INITIAL_CATEGORIES, localRecovered.categories, prev));
        }
        if (Array.isArray(localRecovered.goals) && localRecovered.goals.length > 0) {
          setGoals(prev => mergeEntitiesById(localRecovered.goals, prev));
        }
        if (Array.isArray(localRecovered.tasks) && localRecovered.tasks.length > 0) {
          setTasks(prev => mergeEntitiesById(localRecovered.tasks, prev));
        }
        if (Array.isArray(localRecovered.habits) && localRecovered.habits.length > 0) {
          setHabits(prev => mergeEntitiesById(localRecovered.habits, prev));
        }
        if (Array.isArray(localRecovered.calendarEvents) && localRecovered.calendarEvents.length > 0) {
          setCalendarEvents(prev => mergeEntitiesById(localRecovered.calendarEvents!, prev));
        }
        if (localRecovered.userProfile && localRecovered.userProfile.name) {
          setUserProfile(prev => {
            if (prev?.name && prev.name !== DEFAULT_USER_PROFILE.name) return prev;
            return { ...DEFAULT_USER_PROFILE, ...prev, ...localRecovered.userProfile };
          });
        }
        if (localRecovered.reminderSettings) {
          setReminderSettings(prev => ({ ...DEFAULT_REMINDER_SETTINGS, ...localRecovered.reminderSettings, ...prev }));
        }
      }
    }).catch(err => {
      console.warn('[IndexedDB Hydration]:', err);
    });

    // 2. Also check server data when running in web/Windows mode
    fetchServerData().then(serverData => {
      if (serverData) {
        if (Array.isArray(serverData.categories) && serverData.categories.length > 0) {
          setCategories(prev => mergeEntitiesById(INITIAL_CATEGORIES, serverData.categories, prev));
        }
        if (Array.isArray(serverData.goals) && serverData.goals.length > 0) {
          setGoals(prev => mergeEntitiesById(serverData.goals, prev));
        }
        if (Array.isArray(serverData.tasks) && serverData.tasks.length > 0) {
          setTasks(prev => mergeEntitiesById(serverData.tasks, prev));
        }
        if (Array.isArray(serverData.habits) && serverData.habits.length > 0) {
          setHabits(prev => mergeEntitiesById(serverData.habits, prev));
        }
        if (Array.isArray(serverData.calendarEvents) && serverData.calendarEvents.length > 0) {
          setCalendarEvents(prev => mergeEntitiesById(serverData.calendarEvents!, prev));
        }
        if (serverData.userProfile && serverData.userProfile.name) {
          setUserProfile(prev => (prev?.name && prev.name !== DEFAULT_USER_PROFILE.name) ? prev : serverData.userProfile!);
        }
        if (serverData.reminderSettings) {
          setReminderSettings(prev => prev || serverData.reminderSettings!);
        }
      }
    }).catch(err => {
      console.warn('[Data Hydration]:', err);
    });
  }, []);

  // --- Theme & Version Migration on Mount ---
  useEffect(() => {
    try {
      checkAndPerformVersionUpgradeMigration(
        { categories, goals, tasks, habits, calendarEvents, userProfile, reminderSettings },
        APP_VERSION_INFO.currentVersion,
        APP_VERSION_INFO.versionCode
      );
    } catch (e) {
      console.warn('Migration error caught:', e);
    }

    const pref = getDarkModePreference(userProfile);
    const schedule = getDarkModeSchedule(userProfile);
    const effective = computeEffectiveDarkMode(pref, schedule);
    applyDarkMode(effective);

    const cleanupTheme = setupThemeListeners(pref, schedule);
    return () => {
      cleanupTheme();
    };
  }, [userProfile?.darkModePreference, userProfile?.darkModeSchedule, userProfile?.darkMode]);

  // PWA beforeinstallprompt & online/offline listeners
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Auto-Save Persistence & Snapshots ---
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.GOALS, goals);
  }, [goals]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.HABITS, habits);
  }, [habits]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.USER_PROFILE, userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.REMINDER_SETTINGS, reminderSettings);
  }, [reminderSettings]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.CALENDAR_EVENTS, calendarEvents);
  }, [calendarEvents]);

  // Periodic File-Based Persistence & Lifecycle Flusher: writes to data/ outside public/dist
  useEffect(() => {
    const cleanupPersistence = startPeriodicPersistence(() => ({
      categories,
      goals,
      tasks,
      habits,
      calendarEvents,
      userProfile,
      reminderSettings,
    }), 12000);

    // Debounced quick sync on every user action
    const timer = setTimeout(() => {
      saveLocalSnapshot({
        categories,
        goals,
        tasks,
        habits,
        calendarEvents,
        userProfile,
        reminderSettings,
      });
      triggerServerSync({
        categories,
        goals,
        tasks,
        habits,
        calendarEvents,
        userProfile,
        reminderSettings,
      }, 500);
    }, 1000);

    return () => {
      cleanupPersistence();
      clearTimeout(timer);
    };
  }, [categories, goals, tasks, habits, calendarEvents, userProfile, reminderSettings]);

  // --- Plant Growth State for Today ---
  const plantState = useMemo<PlantState>(() => {
    // 1. Today's active tasks
    const todayTasks = tasks.filter(t => !t.isArchived && (t.dueDate === todayStr || (!t.dueDate && !t.isCompleted)));
    const completedTasksCount = todayTasks.filter(t => t.isCompleted).length;

    // 2. Today's habits (accurate Iranian day of week)
    const todayDayOfWeek = getDayOfWeek(today);
    const activeHabits = habits.filter(h => !h.isClosed);
    const completedHabitsCount = activeHabits.filter(h => !!h.completionHistory?.[todayStr]).length;

    const totalCount = todayTasks.length + activeHabits.length;
    const completedCount = completedTasksCount + completedHabitsCount;

    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    let stage: PlantState['stage'] = 'SEED';
    if (progressPercent >= 100 && totalCount > 0) stage = 'FULL_BLOOM';
    else if (progressPercent >= 80) stage = 'FLOWERING';
    else if (progressPercent >= 60) stage = 'BUDDING';
    else if (progressPercent >= 35) stage = 'SAPLING';
    else if (progressPercent > 0) stage = 'SPROUT';

    return {
      stage,
      progressPercent,
      completedCount,
      totalCount,
    };
  }, [tasks, habits, todayStr, today]);

  // --- Real-time Scheduled Reminder Check (Tasks + Calendar Events) ---
  useEffect(() => {
    if (!reminderSettings.enabled) return;

    const normalizeTimeHHMM = (raw?: string | null): string | null => {
      if (!raw) return null;
      const latin = toLatinDigits(raw.trim());
      const parts = latin.split(':');
      if (parts.length < 2) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const checkScheduledReminders = () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // 1. Check tasks scheduled for today or without date that match current time
      tasks.forEach((task) => {
        if (task.isCompleted || task.isArchived) return;
        if (task.dueDate && task.dueDate !== todayStr) return;

        const rawRemTime = getTaskEffectiveReminderTime(task);
        const effectiveReminderTime = normalizeTimeHHMM(rawRemTime);
        if (!effectiveReminderTime) return;

        const taskKey = `${task.id}_${todayStr}_${effectiveReminderTime}_${task.snoozeCount || 0}`;
        if (notifiedTasksRef.current.has(taskKey)) return;

        if (effectiveReminderTime === currentTimeStr) {
          notifiedTasksRef.current.add(taskKey);

          // Play sound with correct signature: (soundId, customSounds, volume, loopAlarm)
          if (reminderSettings.soundEnabled) {
            try {
              playAlarmSound(
                task.customAlarmSound || reminderSettings.selectedSoundId || 'birds-chirp',
                reminderSettings.customSounds || [],
                reminderSettings.volume ?? 0.8,
                true
              );
            } catch (err) {
              console.warn('Alarm sound play error:', err);
            }
          }

          // Trigger native notification
          sendBrowserNotification(`یادآور جوانه: ${task.title}`, {
            body: task.notes || 'زمان رسیدگی به این برنامه فرا رسیده است.',
            tag: task.id,
            onClick: () => {
              setActiveTab('TASKS');
            }
          });

          // Show in-app alert modal
          setActiveAlertTask(task);
        }
      });

      // 2. Check calendar events with multi-day (up to 3) and multi-time (up to 3) reminders
      calendarEvents.forEach((ev) => {
        if (ev.hasReminder === false) return;

        const daysToNotify = (ev.reminderDays && ev.reminderDays.length > 0)
          ? ev.reminderDays
          : [0];

        // Collect all configured reminder times AND the event's own time so both trigger the alarm
        const rawTimes = new Set<string>();
        if (ev.reminderTimes && ev.reminderTimes.length > 0) {
          ev.reminderTimes.forEach(t => {
            const norm = normalizeTimeHHMM(t);
            if (norm) rawTimes.add(norm);
          });
        }
        if (ev.time) {
          const normEvTime = normalizeTimeHHMM(ev.time);
          if (normEvTime) rawTimes.add(normEvTime);
        }
        if (rawTimes.size === 0) {
          rawTimes.add('09:00');
        }
        const timesToNotify = Array.from(rawTimes);

        const evParts = ev.date.split('/').map(p => parseInt(toLatinDigits(p), 10));
        if (evParts.length !== 3 || isNaN(evParts[0])) return;
        const evJDate = { year: evParts[0], month: evParts[1], day: evParts[2] };

        daysToNotify.forEach(dayOffset => {
          // target date for reminder
          const remJDate = addDaysJalali(evJDate, -dayOffset);
          const remDateStr = jalaliToFormattedString(remJDate);

          const dateMatches = ev.repeatYearly 
            ? remDateStr.slice(5) === todayStr.slice(5)
            : remDateStr === todayStr;

          if (!dateMatches) return;

          timesToNotify.forEach(timeStr => {
            if (!timeStr) return;
            const evKey = `calev_${ev.id}_${todayStr}_day${dayOffset}_${timeStr}`;
            if (notifiedTasksRef.current.has(evKey)) return;

            if (currentTimeStr === timeStr) {
              notifiedTasksRef.current.add(evKey);

              // Play sound with correct signature: (soundId, customSounds, volume, loopAlarm)
              if (reminderSettings.soundEnabled) {
                try {
                  playAlarmSound(
                    reminderSettings.selectedSoundId || 'birds-chirp',
                    reminderSettings.customSounds || [],
                    reminderSettings.volume ?? 0.8,
                    true
                  );
                } catch (err) {
                  console.warn('Alarm sound play error:', err);
                }
              }

              // Trigger native notification
              const typeLabels: Record<string, string> = {
                BIRTHDAY: '🎂 یادآور تولد',
                MEETING: '👥 یادآور جلسه / قرار کاری',
                REMINDER: '🔔 یادآوری تقویم',
                OCCASION: '💐 مناسبت شخصی',
                ANNIVERSARY: '🎉 سالگرد',
                OTHER: '📌 یادآور تقویم',
              };
              const label = typeLabels[ev.type] || '📅 رویداد تقویم';
              const dayLabel = dayOffset === 0 ? 'امروز' : `${toPersianDigits(dayOffset)} روز قبل`;
              sendBrowserNotification(`${label} (${dayLabel}): ${ev.title}`, {
                body: `${ev.time ? `ساعت رویداد: ${toPersianDigits(ev.time)}` : ''}\n${ev.description || 'زمان یادآوری این رویداد در تقویم فرا رسیده است.'}`.trim(),
                tag: `calev-${ev.id}-${dayOffset}`,
                onClick: () => {
                  setActiveTab('CALENDAR');
                }
              });

              // Show in-app alarm modal for calendar event!
              setActiveAlertCalendarEvent(ev);
            }
          });
        });
      });
    };

    const intervalId = window.setInterval(checkScheduledReminders, 5000);
    // Also check immediately when app returns to foreground on Android
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkScheduledReminders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Initial check
    checkScheduledReminders();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [tasks, calendarEvents, reminderSettings, todayStr]);

  // --- Handlers: Tasks ---
  const handleToggleTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextState = !t.isCompleted;
        return {
          ...t,
          isCompleted: nextState,
          completedAt: nextState ? todayStr : null,
        };
      }
      return t;
    }));
  }, [todayStr]);

  const handleSaveTask = useCallback((taskData: AppTask) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === taskData.id);
      if (exists) {
        return prev.map(t => t.id === taskData.id ? taskData : t);
      }
      return [taskData, ...prev];
    });
    setIsTaskModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const handleEditTask = useCallback((task: AppTask) => {
    setEditingTask(task);
    setIsDuplicateTaskMode(false);
    setIsTaskModalOpen(true);
  }, []);

  const handleDuplicateTask = useCallback((task: AppTask) => {
    setEditingTask({
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${task.title} (کپی)`,
      isCompleted: false,
      completedAt: null,
      focusProgressPercent: 0,
      timerSecondsElapsed: 0,
    });
    setIsDuplicateTaskMode(true);
    setIsTaskModalOpen(true);
  }, []);

  const handleNewTask = useCallback((initialDate?: string) => {
    setEditingTask({
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: '',
      notes: '',
      categoryId: categories[0]?.id || 'cat-work',
      dueDate: initialDate || todayStr,
      time: '10:00',
      repeatType: 'NONE',
      repeatDaysOfWeek: [],
      timerSecondsTarget: 25 * 60,
      timerSecondsElapsed: 0,
      isCompleted: false,
    });
    setIsDuplicateTaskMode(false);
    setIsTaskModalOpen(true);
  }, [categories, todayStr]);

  const handleArchiveTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isArchived: true } : t));
  }, []);

  const handleRestoreTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isArchived: false } : t));
  }, []);

  const handleClearArchivedTasks = useCallback((taskIds?: string[]) => {
    if (taskIds && taskIds.length > 0) {
      setTasks(prev => prev.filter(t => !taskIds.includes(t.id)));
    } else {
      setTasks(prev => prev.filter(t => !t.isArchived));
    }
  }, []);

  const handleTransferTask = useCallback((
    taskId: string, 
    targetGoalId: string | null, 
    closeTask: boolean, 
    noteAppend?: string
  ) => {
    const targetGoal = goals.find(g => g.id === targetGoalId);
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          goalId: targetGoalId,
          isCompleted: closeTask ? true : t.isCompleted,
          completedAt: closeTask ? todayStr : t.completedAt,
          isTransferredToNextSeason: !closeTask,
          transferredToGoalId: targetGoalId,
          transferredToSeasonIndex: targetGoal?.seasonIndex ?? null,
          notes: noteAppend ? `${t.notes || ''}\n${noteAppend}`.trim() : t.notes,
        };
      }
      return t;
    }));
    setTaskToTransfer(null);
  }, [goals, todayStr]);

  const handleCreateSeasonalGoalAndTransfer = useCallback((
    taskId: string, 
    seasonIdx: number, 
    year: number, 
    title: string, 
    parentAnnualId?: string | null, 
    categoryId?: string,
    continuesGoalId?: string | null
  ) => {
    const curTask = tasks.find(t => t.id === taskId);
    const curGoal = goals.find(g => g.id === curTask?.goalId);

    const newGoalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveCategory = categoryId || curTask?.categoryId || curGoal?.categoryId || categories[0]?.id || 'cat-work';
    const effectiveParent = parentAnnualId || curGoal?.parentId || (curGoal?.period === 'ANNUAL' ? curGoal.id : null);
    const effectiveContinues = continuesGoalId || (curGoal?.period === 'SEASONAL' ? curGoal.id : null);

    const newGoal: Goal = {
      id: newGoalId,
      title: title.trim(),
      description: `هدف فصل ${PERSIAN_SEASONS[seasonIdx]?.name} (وابسته به تسک «${curTask?.title || ''}»)`,
      visionWhy: curGoal?.visionWhy || `امتداد و تکمیل اقدامات فصل ${curGoal?.seasonIndex !== undefined ? PERSIAN_SEASONS[curGoal.seasonIndex]?.name : 'گذشته'}`,
      year,
      period: 'SEASONAL',
      status: 'IN_PROGRESS',
      startDate: todayStr,
      seasonIndex: seasonIdx,
      parentId: effectiveParent,
      categoryId: effectiveCategory,
      plantType: curGoal?.plantType || 'بونسای',
      continuesGoalId: effectiveContinues,
      originTaskId: taskId,
      history: [
        {
          id: `hist_${Date.now()}`,
          timestamp: getCurrentPersianDateTimeString(),
          action: 'CREATED',
          description: `ایجاد هدف فصلی وابسته به تسک «${curTask?.title || ''}» در ادامه هدف «${curGoal?.title || ''}»`,
        }
      ],
      createdAt: todayStr,
    };

    setGoals(prev => [...prev, newGoal]);

    // Transfer task to this new seasonal goal
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          goalId: newGoalId,
          isTransferredToNextSeason: true,
          transferredToGoalId: newGoalId,
          transferredToSeasonIndex: seasonIdx,
          notes: t.notes 
            ? `${t.notes}\n[انتقال به فصل ${PERSIAN_SEASONS[seasonIdx]?.name} ذیل هدف «${newGoal.title}»]`.trim()
            : `[انتقال به فصل ${PERSIAN_SEASONS[seasonIdx]?.name} ذیل هدف «${newGoal.title}»]`
        };
      }
      return t;
    }));

    setTaskToTransfer(null);
  }, [tasks, goals, categories, todayStr]);

  // --- Handlers: Calendar Events (تولد، جلسه، یادآور مستقل تقویم) ---
  const handleNewCalendarEvent = useCallback((targetDate?: string) => {
    setCalendarEventTargetDate(targetDate || todayStr);
    setEditingCalendarEvent(null);
    setIsCalendarEventModalOpen(true);
  }, [todayStr]);

  const handleEditCalendarEvent = useCallback((event: CalendarEvent) => {
    setEditingCalendarEvent(event);
    setCalendarEventTargetDate(event.date);
    setIsCalendarEventModalOpen(true);
  }, []);

  const handleSaveCalendarEvent = useCallback((event: CalendarEvent) => {
    setCalendarEvents(prev => {
      const idx = prev.findIndex(e => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [...prev, event];
    });
    setIsCalendarEventModalOpen(false);
    setEditingCalendarEvent(null);
  }, []);

  const handleDeleteCalendarEvent = useCallback((eventId: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
  }, []);

  // --- Handlers: Habits ---
  const handleToggleHabitDate = useCallback((habitId: string, dateStr: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const currentDone = Boolean(h.completionHistory?.[dateStr]);
        return {
          ...h,
          completionHistory: {
            ...(h.completionHistory || {}),
            [dateStr]: !currentDone,
          },
        };
      }
      return h;
    }));
  }, []);

  const handleSaveHabit = useCallback((habitData: Habit) => {
    setHabits(prev => {
      const exists = prev.some(h => h.id === habitData.id);
      if (exists) {
        return prev.map(h => h.id === habitData.id ? habitData : h);
      }
      return [habitData, ...prev];
    });
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  }, []);

  const handleDeleteHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, []);

  const handleEditHabit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setIsDuplicateHabitMode(false);
    setIsHabitModalOpen(true);
  }, []);

  const handleDuplicateHabit = useCallback((habit: Habit) => {
    setEditingHabit({
      ...habit,
      id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${habit.title} (کپی)`,
      completionHistory: {},
      dailyProgressHistory: {},
      dailyElapsedSeconds: {},
      createdAt: todayStr,
    });
    setIsDuplicateHabitMode(true);
    setIsHabitModalOpen(true);
  }, [todayStr]);

  const handleNewHabit = useCallback(() => {
    setEditingHabit({
      id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: '',
      notes: '',
      categoryId: categories[0]?.id || 'cat-work',
      time: '08:00',
      timerMinutes: 15,
      frequency: 'DAILY',
      targetDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      exemptHolidays: false,
      exemptWeekends: false,
      plantType: 'بونسای',
      completionHistory: {},
      createdAt: todayStr,
    });
    setIsDuplicateHabitMode(false);
    setIsHabitModalOpen(true);
  }, [categories, todayStr]);

  const handleToggleCloseHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const nextClosed = !h.isClosed;
        return {
          ...h,
          isClosed: nextClosed,
          closedAt: nextClosed ? todayStr : null,
        };
      }
      return h;
    }));
  }, [todayStr]);

  // --- Handlers: Goals ---
  const handleSaveGoal = useCallback((goalData: Goal) => {
    setGoals(prev => {
      const exists = prev.some(g => g.id === goalData.id);
      if (exists) {
        return prev.map(g => g.id === goalData.id ? goalData : g);
      }
      return [goalData, ...prev];
    });
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  }, []);

  const handleDeleteGoal = useCallback((goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
  }, []);

  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  }, []);

  const handleNewGoal = useCallback((
    parentId?: string | null,
    period?: 'ANNUAL' | 'SEASONAL' | 'MONTHLY',
    seasonIndex?: number
  ) => {
    const parent = parentId ? goals.find(g => g.id === parentId) : null;
    const catId = parent?.categoryId || categories[0]?.id || 'cat-work';

    setEditingGoal({
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: '',
      description: '',
      year: parent?.year || today.year,
      period: period || (parentId ? 'SEASONAL' : 'ANNUAL'),
      status: 'IN_PROGRESS',
      startDate: todayStr,
      parentId: parentId || null,
      seasonIndex: seasonIndex !== undefined ? seasonIndex : (period === 'SEASONAL' ? Math.floor((today.month - 1) / 3) : undefined),
      categoryId: catId,
      plantType: parent?.plantType || 'بونسای',
      history: [
        {
          id: `h_${Date.now()}`,
          timestamp: getCurrentPersianDateTimeString(),
          action: 'CREATED',
          description: 'ایجاد اولیه هدف'
        }
      ],
      createdAt: todayStr,
    });
    setIsGoalModalOpen(true);
  }, [goals, categories, today, todayStr]);

  const handleUpdateGoalProgress = useCallback((
    goalId: string, 
    manualProgress: number | null, 
    isManualActive: boolean
  ) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          manualProgress,
          isManualProgressActive: isManualActive,
          status: manualProgress === 100 ? 'COMPLETED' : g.status,
          history: [
            ...g.history,
            {
              id: `h_${Date.now()}`,
              timestamp: getCurrentPersianDateTimeString(),
              action: 'EDITED',
              description: `تنظیم دستی پیشرفت به ${toPersianDigits(manualProgress ?? 0)}٪`
            }
          ]
        };
      }
      return g;
    }));
  }, []);

  const handleGoalWizardSave = useCallback((
    annualGoal: Goal, 
    intermediateGoals: Goal[], 
    microTask?: AppTask, 
    microHabit?: Habit
  ) => {
    setGoals(prev => [annualGoal, ...intermediateGoals, ...prev]);
    if (microTask) setTasks(prev => [microTask, ...prev]);
    if (microHabit) setHabits(prev => [microHabit, ...prev]);
    setIsAnnualWizardOpen(false);
  }, []);

  // --- Handlers: Timer & Focus Sessions ---
  const handleOpenTimer = useCallback((
    title: string,
    minutes: number,
    onDone?: (elapsedSeconds: number, isFullyCompleted: boolean) => void,
    options?: {
      entityType?: 'TASK' | 'HABIT';
      taskId?: string;
      habitId?: string;
      initialElapsedSeconds?: number;
      currentProgressPercent?: number;
    }
  ) => {
    setTimerState({
      isOpen: true,
      title,
      minutes,
      entityType: options?.entityType || 'TASK',
      taskId: options?.taskId,
      habitId: options?.habitId,
      initialElapsedSeconds: options?.initialElapsedSeconds || 0,
      currentProgressPercent: options?.currentProgressPercent || 0,
      onDone,
    });
  }, []);

  const handleTimerComplete = useCallback((elapsedSeconds: number, isFullyCompleted: boolean) => {
    const { taskId, habitId, entityType, onDone, minutes } = timerState;

    if (onDone) {
      onDone(elapsedSeconds, isFullyCompleted);
    }

    const log: FocusSessionLog = {
      id: `focus_${Date.now()}`,
      dateStr: todayStr,
      timestamp: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      targetSeconds: (minutes || 25) * 60,
      completed100: isFullyCompleted,
      progressPercent: Math.min(100, Math.round((elapsedSeconds / ((minutes || 25) * 60)) * 100)),
    };

    if (entityType === 'TASK' && taskId) {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          const sessions = [...(t.focusSessions || []), log];
          return {
            ...t,
            timerSecondsElapsed: (t.timerSecondsElapsed || 0) + elapsedSeconds,
            focusProgressPercent: isFullyCompleted ? 100 : Math.min(100, Math.round(((t.timerSecondsElapsed || 0) + elapsedSeconds) / (t.timerSecondsTarget || 1500) * 100)),
            isCompleted: isFullyCompleted ? true : t.isCompleted,
            completedAt: isFullyCompleted ? todayStr : t.completedAt,
            focusSessions: sessions,
          };
        }
        return t;
      }));
    } else if (entityType === 'HABIT' && habitId) {
      setHabits(prev => prev.map(h => {
        if (h.id === habitId) {
          const sessions = [...(h.focusSessions || []), log];
          const prevDayElapsed = h.dailyElapsedSeconds?.[todayStr] || 0;
          return {
            ...h,
            dailyElapsedSeconds: {
              ...(h.dailyElapsedSeconds || {}),
              [todayStr]: prevDayElapsed + elapsedSeconds,
            },
            dailyProgressHistory: {
              ...(h.dailyProgressHistory || {}),
              [todayStr]: isFullyCompleted ? 100 : Math.min(100, Math.round(((prevDayElapsed + elapsedSeconds) / ((h.timerMinutes || 15) * 60)) * 100)),
            },
            completionHistory: {
              ...(h.completionHistory || {}),
              [todayStr]: isFullyCompleted ? true : Boolean(h.completionHistory?.[todayStr]),
            },
            focusSessions: sessions,
          };
        }
        return h;
      }));
    }

    setTimerState(prev => ({ ...prev, isOpen: false }));
  }, [timerState, todayStr]);

  // --- Handlers: Settings & Backup ---
  const handleSaveUserProfile = useCallback((profile: UserProfile) => {
    setUserProfile(prev => {
      const merged: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        ...prev,
        ...profile,
      };
      saveUserProfileImmediate(merged);
      return merged;
    });
  }, []);

  const handleSaveReminderSettings = useCallback((settings: ReminderSettings) => {
    setReminderSettings(settings);
    saveToLocalStorage(STORAGE_KEYS.REMINDER_SETTINGS, settings);
  }, []);

  const handleSaveCategory = useCallback((cat: Category) => {
    setCategories(prev => {
      const exists = prev.some(c => c.id === cat.id);
      if (exists) return prev.map(c => c.id === cat.id ? cat : c);
      return [...prev, cat];
    });
  }, []);

  const handleDeleteCategory = useCallback((catId: string) => {
    setCategories(prev => prev.filter(c => c.id !== catId));
  }, []);

  const handleResetCategories = useCallback(() => {
    setCategories(INITIAL_CATEGORIES);
  }, []);

  const handleImportTasksOnly = useCallback((importedTasks: AppTask[], mode: 'REPLACE' | 'MERGE' = 'MERGE') => {
    setTasks(prev => {
      const next = mode === 'REPLACE' ? importedTasks : mergeEntitiesById(prev, importedTasks);
      saveToLocalStorage(STORAGE_KEYS.TASKS, next);
      return next;
    });
  }, []);

  const handleImportAllData = useCallback((
    data: {
      categories?: Category[];
      goals?: Goal[];
      tasks?: AppTask[];
      habits?: Habit[];
      calendarEvents?: CalendarEvent[];
      userProfile?: UserProfile;
      reminderSettings?: ReminderSettings;
      appPreferences?: AppPreferences;
    },
    mode: 'REPLACE' | 'MERGE' = 'MERGE'
  ) => {
    const isReplace = mode === 'REPLACE';

    // 1. Categories
    let nextCategories = categories;
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      nextCategories = isReplace
        ? data.categories
        : mergeEntitiesById(INITIAL_CATEGORIES, categories, data.categories);
      setCategories(nextCategories);
      saveToLocalStorage(STORAGE_KEYS.CATEGORIES, nextCategories);
    }

    // 2. Goals
    let nextGoals = goals;
    if (Array.isArray(data.goals)) {
      nextGoals = isReplace
        ? data.goals
        : mergeEntitiesById(goals, data.goals);
      setGoals(nextGoals);
      saveToLocalStorage(STORAGE_KEYS.GOALS, nextGoals);
    }

    // 3. Tasks
    let nextTasks = tasks;
    if (Array.isArray(data.tasks)) {
      nextTasks = isReplace
        ? data.tasks
        : mergeEntitiesById(tasks, data.tasks);
      setTasks(nextTasks);
      saveToLocalStorage(STORAGE_KEYS.TASKS, nextTasks);
    }

    // 4. Habits
    let nextHabits = habits;
    if (Array.isArray(data.habits)) {
      nextHabits = isReplace
        ? data.habits
        : mergeEntitiesById(habits, data.habits);
      setHabits(nextHabits);
      saveToLocalStorage(STORAGE_KEYS.HABITS, nextHabits);
    }

    // 5. Calendar Events
    let nextCalendarEvents = calendarEvents;
    if (Array.isArray(data.calendarEvents)) {
      nextCalendarEvents = isReplace
        ? data.calendarEvents
        : mergeEntitiesById(calendarEvents, data.calendarEvents);
      setCalendarEvents(nextCalendarEvents);
      saveToLocalStorage(STORAGE_KEYS.CALENDAR_EVENTS, nextCalendarEvents);
    }

    // 6. User Profile
    let nextUserProfile = userProfile;
    if (data.userProfile) {
      nextUserProfile = isReplace
        ? { ...DEFAULT_USER_PROFILE, ...data.userProfile }
        : { ...DEFAULT_USER_PROFILE, ...userProfile, ...data.userProfile };
      setUserProfile(nextUserProfile);
      saveUserProfileImmediate(nextUserProfile);
    }

    // 7. Reminder Settings (including custom alarm sounds)
    let nextReminderSettings = reminderSettings;
    if (data.reminderSettings) {
      const mergedCustomSounds = isReplace
        ? (data.reminderSettings.customSounds || [])
        : mergeEntitiesById(reminderSettings.customSounds || [], data.reminderSettings.customSounds || []);
      nextReminderSettings = {
        ...DEFAULT_REMINDER_SETTINGS,
        ...(isReplace ? {} : reminderSettings),
        ...data.reminderSettings,
        customSounds: mergedCustomSounds,
      };
      setReminderSettings(nextReminderSettings);
      saveToLocalStorage(STORAGE_KEYS.REMINDER_SETTINGS, nextReminderSettings);
    }

    // 8. App Preferences (Theme, Dark Mode schedule, Plant animations, Haptic, GitHub config)
    if (data.appPreferences || data.userProfile) {
      applyRestoredAppPreferences(data.appPreferences, nextUserProfile);
      const pref = getDarkModePreference(nextUserProfile);
      const schedule = getDarkModeSchedule(nextUserProfile);
      applyDarkMode(computeEffectiveDarkMode(pref, schedule));
    }

    // 9. Immediate multi-layer snapshot + server persistence
    const fullBundle = {
      categories: nextCategories,
      goals: nextGoals,
      tasks: nextTasks,
      habits: nextHabits,
      calendarEvents: nextCalendarEvents,
      userProfile: nextUserProfile,
      reminderSettings: nextReminderSettings,
    };
    saveLocalSnapshot(fullBundle);
    saveServerDataImmediate(fullBundle);
  }, [categories, goals, tasks, habits, calendarEvents, userProfile, reminderSettings]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  // Nav Items
  const navItems = [
    { id: 'TODAY' as MainTab, label: 'امروز', icon: Sun },
    { id: 'TASKS' as MainTab, label: 'وظایف', icon: CheckSquare, badge: tasks.filter(t => !t.isCompleted && !t.isArchived).length },
    { id: 'HABITS' as MainTab, label: 'عادت‌ها', icon: RotateCw, badge: habits.filter(h => !h.isClosed && !h.completionHistory?.[todayStr]).length },
    { id: 'GOALS' as MainTab, label: 'اهداف', icon: Target },
    { id: 'CALENDAR' as MainTab, label: 'تقویم', icon: CalendarIcon },
    { id: 'REPORTS' as MainTab, label: 'گزارشات', icon: BarChart3 },
    { id: 'SETTINGS' as MainTab, label: 'تنظیمات', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9F5] text-[#1A2E1A] flex flex-col font-sans select-none antialiased selection:bg-emerald-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 py-2.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('TODAY')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-900">
                  جوانه
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  v{APP_VERSION_INFO.currentVersion}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-none">
                {formatHeaderPersianDate(today)}
              </p>
            </div>
          </div>

          {/* Plant Progress Indicator & Fast Actions */}
          <div className="flex items-center gap-2">
            {/* Today Plant Status Pill with Dynamic Growth & Circular Progress Ring */}
            <div 
              onClick={() => setActiveTab('TODAY')}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 hover:bg-emerald-100/90 rounded-xl border border-emerald-200/80 cursor-pointer transition-all shadow-2xs group"
              title={`رشد امروز: ${toPersianDigits(plantState.progressPercent)}٪ - کلیک برای مشاهده باغچه امروز`}
            >
              <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                {/* SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                  <path
                    className="text-emerald-200/80"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${plantState.progressPercent >= 100 ? 'text-amber-500' : 'text-emerald-600'} transition-all duration-700 ease-out`}
                    strokeDasharray={`${plantState.progressPercent}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                {/* Dynamically Growing Plant Icon */}
                <div className="w-5 h-5 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <PlantIcon 
                    type={userProfile?.avatarUrl || 'بونسای'} 
                    stage={plantState.stage} 
                    progressPercent={plantState.progressPercent}
                    className="w-full h-full" 
                  />
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-bold text-emerald-950 flex items-center gap-1">
                  <span className="truncate max-w-[90px] sm:max-w-[140px]">
                    {userProfile?.name ? `${userProfile.name}:` : 'رشد امروز:'}
                  </span>
                  <span className={`font-mono font-black ${plantState.progressPercent >= 100 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    %{toPersianDigits(plantState.progressPercent)}
                  </span>
                </div>
                {userProfile?.title && (
                  <div className="text-[9px] text-emerald-700/80 font-medium truncate max-w-[110px] sm:max-w-[150px] hidden xs:block">
                    {userProfile.title}
                  </div>
                )}
              </div>
            </div>

            {/* Offline Status Badge */}
            {!isOnline && (
              <div
                onClick={() => setIsPwaInstallModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[10px] font-bold cursor-pointer"
                title="برنامه در حالت آفلاین کار می‌کند و تغییرات در حافظه دستگاه ذخیره می‌شوند"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">حالت آفلاین</span>
              </div>
            )}

            {/* Install Android APK Button */}
            {!isStandalone && (
              <button
                type="button"
                onClick={() => setIsPwaInstallModalOpen(true)}
                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200/90 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="دانلود و نصب نسخه اندروید (APK) روی گوشی"
              >
                <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                <span className="hidden xs:inline sm:inline">دانلود اپ اندروید</span>
              </button>
            )}

            {/* Quick Add Button */}
            <button
              type="button"
              onClick={() => handleNewTask()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="افزودن تسک سریع"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 pb-24">
        {activeTab === 'TODAY' && (
          <TodayScreen
            tasks={tasks}
            habits={habits}
            goals={goals}
            categories={categories}
            plantState={plantState}
            userProfile={userProfile}
            onOpenSettings={() => setActiveTab('SETTINGS')}
            onToggleTask={handleToggleTask}
            onToggleHabitToday={(id) => handleToggleHabitDate(id, todayStr)}
            onToggleHabitDate={handleToggleHabitDate}
            onOpenTimer={handleOpenTimer}
            onOpenNewTask={() => handleNewTask()}
            onOpenNewHabit={() => handleNewHabit()}
            onDuplicateTask={handleDuplicateTask}
            onEditTask={handleEditTask}
            calendarEvents={calendarEvents}
            onTransferTask={handleTransferTask}
            onCreateSeasonalGoalAndTransfer={handleCreateSeasonalGoalAndTransfer}
            onNewCalendarEvent={handleNewCalendarEvent}
            onEditCalendarEvent={handleEditCalendarEvent}
          />
        )}

        {activeTab === 'TASKS' && (
          <TasksScreen
            tasks={tasks}
            categories={categories}
            goals={goals}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            onNewTask={() => handleNewTask()}
            onOpenTimer={handleOpenTimer}
            onTransferTask={handleTransferTask}
            onCreateSeasonalGoalAndTransfer={handleCreateSeasonalGoalAndTransfer}
            onArchiveTask={handleArchiveTask}
            onRestoreTask={handleRestoreTask}
            onClearArchivedTasks={handleClearArchivedTasks}
            onDuplicateTask={handleDuplicateTask}
            onOpenTasksBackup={() => {
              try {
                localStorage.setItem('javaneh_settings_active_tab', 'DATA');
              } catch {}
              setActiveTab('SETTINGS');
            }}
          />
        )}

        {activeTab === 'HABITS' && (
          <HabitsScreen
            habits={habits}
            categories={categories}
            goals={goals}
            onToggleHabitDate={handleToggleHabitDate}
            onDeleteHabit={handleDeleteHabit}
            onEditHabit={handleEditHabit}
            onDuplicateHabit={handleDuplicateHabit}
            onNewHabit={handleNewHabit}
            onOpenTimer={handleOpenTimer}
            onToggleCloseHabit={handleToggleCloseHabit}
          />
        )}

        {activeTab === 'GOALS' && (
          <GoalsScreen
            goals={goals}
            tasks={tasks}
            habits={habits}
            categories={categories}
            onOpenAnnualWizard={() => setIsAnnualWizardOpen(true)}
            onNewGoal={handleNewGoal}
            onEditGoal={handleEditGoal}
            onDeleteGoal={handleDeleteGoal}
            onViewHistory={(g) => setSelectedHistoryGoal(g)}
            onNewTaskForGoal={(gId) => {
              setEditingTask({
                id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: '',
                notes: '',
                categoryId: categories[0]?.id || 'cat-work',
                goalId: gId,
                dueDate: todayStr,
                repeatType: 'NONE',
                repeatDaysOfWeek: [],
                timerSecondsTarget: 25 * 60,
                timerSecondsElapsed: 0,
                isCompleted: false,
              });
              setIsTaskModalOpen(true);
            }}
            onNewHabitForGoal={(gId) => {
              setEditingHabit({
                id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: '',
                notes: '',
                categoryId: categories[0]?.id || 'cat-work',
                goalId: gId,
                frequency: 'DAILY',
                targetDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                exemptHolidays: false,
                exemptWeekends: false,
                plantType: 'بونسای',
                timerMinutes: 15,
                completionHistory: {},
                createdAt: todayStr,
              });
              setIsHabitModalOpen(true);
            }}
            onToggleTask={handleToggleTask}
            onToggleHabitToday={(id) => handleToggleHabitDate(id, todayStr)}
            onOpenTimer={handleOpenTimer}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onDeleteCategory={handleDeleteCategory}
            onTransferTask={handleTransferTask}
            onCreateSeasonalGoalAndTransfer={handleCreateSeasonalGoalAndTransfer}
          />
        )}

        {activeTab === 'CALENDAR' && (
          <PersianCalendarScreen
            tasks={tasks}
            habits={habits}
            categories={categories}
            goals={goals}
            calendarEvents={calendarEvents}
            onToggleTask={handleToggleTask}
            onToggleHabitDate={handleToggleHabitDate}
            onOpenTimer={handleOpenTimer}
            onNewTaskWithDate={(dateStr) => handleNewTask(dateStr)}
            onNewCalendarEvent={handleNewCalendarEvent}
            onEditCalendarEvent={handleEditCalendarEvent}
            onDeleteCalendarEvent={handleDeleteCalendarEvent}
          />
        )}

        {activeTab === 'REPORTS' && (
          <ReportsScreen
            tasks={tasks}
            habits={habits}
            goals={goals}
            categories={categories}
            onNavigateToGoals={() => setActiveTab('GOALS')}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <SettingsScreen
            categories={categories}
            goals={goals}
            tasks={tasks}
            habits={habits}
            calendarEvents={calendarEvents}
            userProfile={userProfile}
            reminderSettings={reminderSettings}
            deferredPrompt={deferredPrompt}
            onInstallClick={handleInstallClick}
            onSaveUserProfile={handleSaveUserProfile}
            onSaveReminderSettings={handleSaveReminderSettings}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onResetCategories={handleResetCategories}
            onImportTasksOnly={handleImportTasksOnly}
            onImportAllData={handleImportAllData}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-lg px-2 py-1.5">
        <div className="max-w-md mx-auto grid grid-cols-7 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-emerald-700 bg-emerald-50/90 font-black scale-105'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono shadow-xs">
                      {toPersianDigits(item.badge! > 99 ? '99+' : item.badge!)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        task={editingTask}
        categories={categories}
        goals={goals}
        reminderSettings={reminderSettings}
        isDuplicate={isDuplicateTaskMode}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      <HabitModal
        isOpen={isHabitModalOpen}
        habit={editingHabit}
        categories={categories}
        goals={goals}
        isDuplicate={isDuplicateHabitMode}
        onClose={() => {
          setIsHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        goal={editingGoal}
        categories={categories}
        existingGoals={goals}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
      />

      <AnnualGoalWizardModal
        isOpen={isAnnualWizardOpen}
        categories={categories}
        onClose={() => setIsAnnualWizardOpen(false)}
        onSaveComplete={handleGoalWizardSave}
      />

      <GoalDetailHistoryModal
        isOpen={Boolean(selectedHistoryGoal)}
        goal={selectedHistoryGoal}
        subGoals={goals.filter(g => g.parentId === selectedHistoryGoal?.id)}
        linkedTasks={tasks.filter(t => t.goalId === selectedHistoryGoal?.id)}
        onClose={() => setSelectedHistoryGoal(null)}
        onEdit={(g) => {
          setSelectedHistoryGoal(null);
          handleEditGoal(g);
        }}
        onUpdateStatus={(gId, status, note) => {
          setGoals(prev => prev.map(g => {
            if (g.id === gId) {
              return {
                ...g,
                status,
                history: [
                  ...g.history,
                  {
                    id: `h_${Date.now()}`,
                    timestamp: getCurrentPersianDateTimeString(),
                    action: 'STATUS_CHANGED',
                    description: `تغییر وضعیت به ${status}${note ? `: ${note}` : ''}`,
                  }
                ]
              };
            }
            return g;
          }));
        }}
        onAddNote={(gId, note) => {
          setGoals(prev => prev.map(g => {
            if (g.id === gId) {
              return {
                ...g,
                history: [
                  ...g.history,
                  {
                    id: `h_${Date.now()}`,
                    timestamp: getCurrentPersianDateTimeString(),
                    action: 'NOTE_ADDED',
                    description: note,
                  }
                ]
              };
            }
            return g;
          }));
        }}
      />

      <TimerModal
        isOpen={timerState.isOpen}
        title={timerState.title}
        initialMinutes={timerState.minutes}
        initialElapsedSeconds={timerState.initialElapsedSeconds}
        currentProgressPercent={timerState.currentProgressPercent}
        entityType={timerState.entityType}
        onClose={() => setTimerState(prev => ({ ...prev, isOpen: false }))}
        onComplete={handleTimerComplete}
      />

      <ReminderAlertModal
        isOpen={Boolean(activeAlertTask || activeAlertCalendarEvent)}
        task={activeAlertTask}
        calendarEvent={activeAlertCalendarEvent}
        category={categories.find(c => c.id === activeAlertTask?.categoryId)}
        soundTitle={reminderSettings.selectedSoundId}
        reminderSettings={reminderSettings}
        holidayNotice={isDateHoliday(today)?.title}
        onDismiss={() => {
          stopAllAlarmSounds();
          setActiveAlertTask(null);
          setActiveAlertCalendarEvent(null);
        }}
        onComplete={(tId) => {
          stopAllAlarmSounds();
          handleToggleTask(tId);
          setActiveAlertTask(null);
        }}
        onSnooze={(id, mins) => {
          stopAllAlarmSounds();
          const nextSnoozeAt = calculateSnoozeTime(mins);

          if (activeAlertTask && activeAlertTask.id === id) {
            setTasks(prev => prev.map(t => t.id === id ? {
              ...t,
              nextSnoozeAt,
              snoozeCount: (t.snoozeCount || 0) + 1,
            } : t));
            setActiveAlertTask(null);
          } else if (activeAlertCalendarEvent && activeAlertCalendarEvent.id === id) {
            setCalendarEvents(prev => prev.map(ev => {
              if (ev.id !== id) return ev;
              const existingTimes = Array.isArray(ev.reminderTimes) ? ev.reminderTimes : [];
              const updatedTimes = existingTimes.includes(nextSnoozeAt)
                ? existingTimes
                : [nextSnoozeAt, ...existingTimes].slice(0, 3);
              return {
                ...ev,
                hasReminder: true,
                reminderTimes: updatedTimes,
              };
            }));
            setActiveAlertCalendarEvent(null);
          }
        }}
      />

      {taskToTransfer && (
        <TransferTaskModal
          isOpen={Boolean(taskToTransfer)}
          task={taskToTransfer}
          goals={goals}
          categories={categories}
          onClose={() => setTaskToTransfer(null)}
          onTransfer={handleTransferTask}
          onCreateSeasonalGoalAndTransfer={handleCreateSeasonalGoalAndTransfer}
        />
      )}

      {/* Calendar Event Modal (تولد، جلسه، یادآوری مستقل تقویم) */}
      <CalendarEventModal
        isOpen={isCalendarEventModalOpen}
        event={editingCalendarEvent}
        initialDate={calendarEventTargetDate}
        onClose={() => {
          setIsCalendarEventModalOpen(false);
          setEditingCalendarEvent(null);
        }}
        onSave={handleSaveCalendarEvent}
        onDelete={handleDeleteCalendarEvent}
      />

      {/* PWA Web App Installation & Offline Readiness Modal */}
      <ApkDownloadConfirmModal
        isOpen={isPwaInstallModalOpen}
        onClose={() => setIsPwaInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
      />
    </div>
  );
};
