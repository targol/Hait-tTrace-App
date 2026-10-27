import React, { useState, useRef, useEffect } from 'react';
import { 
  Category, 
  Goal, 
  AppTask, 
  Habit, 
  AppBackupData, 
  UserProfile, 
  ReminderSettings, 
  AlarmSoundItem,
  DarkModePreference,
  DarkModeSchedule,
  CalendarEvent,
  AppPreferences
} from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';
import { PlantIcon, ALL_PLANT_TYPES } from './PlantIcon';
import { toPersianDigits, getTodayJalali, getCurrentPersianDateTimeString } from '../calendar/jalali';
import { PRESET_ALARM_SOUNDS, previewSound, stopAllAlarmSounds, playAlarmSound } from '../services/soundService';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, sendBrowserNotification } from '../services/reminderService';
import { 
  DEFAULT_USER_PROFILE, 
  DEFAULT_REMINDER_SETTINGS, 
  getOrCreateUserId,
  buildCompleteAppBackupPayload,
  exportBackupFileUniversal,
  shareBackupFileUniversal
} from '../services/storageService';
import { 
  getDarkModePreference, 
  getDarkModeSchedule, 
  computeEffectiveDarkMode, 
  applyDarkMode, 
  isSystemDarkMode, 
  setupThemeListeners, 
  THEME_STORAGE_KEYS,
  DEFAULT_DARK_MODE_SCHEDULE,
  isTimeInSchedule
} from '../services/themeService';
import { UserProfileSettings } from './UserProfileSettings';
import { ReminderAlarmSettings } from './ReminderAlarmSettings';
import { UpdateAndBackupModal } from './UpdateAndBackupModal';
import { ApkDownloadConfirmModal } from './ApkDownloadConfirmModal';
import { APP_VERSION_INFO } from '../version';
import { validateAndSanitizeBackupJson } from '../services/backupValidationService';
import { 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Check, 
  X, 
  Tag, 
  Sprout, 
  Palette, 
  Download, 
  Upload, 
  Calendar, 
  Info,
  Briefcase,
  BookOpen,
  HeartPulse,
  Home,
  Compass,
  DollarSign,
  Dumbbell,
  GraduationCap,
  Code,
  Sparkles,
  Coffee,
  Music,
  Smile,
  Sun,
  Heart,
  Target,
  Database,
  ShieldCheck,
  HardDrive,
  Copy,
  FileText,
  AlertTriangle,
  FileUp,
  CheckCircle2,
  Layers,
  ArrowRight,
  User,
  Camera,
  Bell,
  Volume2,
  Play,
  Square,
  Music2,
  FileAudio,
  Sliders,
  Image as ImageIcon,
  Star,
  Smartphone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Share2,
  Moon,
  Monitor,
  Flame,
  Vibrate,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  GitBranch,
  FolderGit2
} from 'lucide-react';

export type SettingsTabId = 'PROFILE' | 'REMINDERS' | 'THEMES' | 'CATEGORIES' | 'DATA' | 'ALL';

interface Props {
  categories: Category[];
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  calendarEvents?: CalendarEvent[];
  userProfile?: UserProfile;
  reminderSettings?: ReminderSettings;
  deferredPrompt?: any;
  onInstallClick?: () => void;
  onSaveUserProfile?: (profile: UserProfile) => void;
  onSaveReminderSettings?: (settings: ReminderSettings) => void;
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onResetCategories: () => void;
  onImportTasksOnly?: (tasks: AppTask[], mode: 'REPLACE' | 'MERGE') => void;
  onImportAllData?: (
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
    mode?: 'REPLACE' | 'MERGE'
  ) => void;
}

export interface ColorThemeItem {
  id: string;
  name: string;
  subtitle: string;
  primaryHex: string;
  accentHex: string;
  gradientHeader: string;
  badgeClass: string;
  activeRing: string;
  emoji: string;
  description: string;
}

export const THEME_PALETTES: ColorThemeItem[] = [
  {
    id: 'emerald',
    name: 'زمردی جوانه',
    subtitle: 'رویش، طبیعت و نشاط بهاری (پیش‌فرض)',
    primaryHex: '#10B981',
    accentHex: '#059669',
    gradientHeader: 'from-emerald-900 via-emerald-800 to-teal-900',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    activeRing: 'ring-emerald-500',
    emoji: '🌱',
    description: 'تم اصیل و امضای تصویری برنامه جوانه، نماد رشد مداوم و انگیزه روزانه'
  },
  {
    id: 'teal',
    name: 'فیروزه‌ای خلیج',
    subtitle: 'آرامش اقیانوس و زلالی ذهن',
    primaryHex: '#0D9488',
    accentHex: '#06B6D4',
    gradientHeader: 'from-teal-900 via-teal-800 to-cyan-900',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    activeRing: 'ring-teal-500',
    emoji: '🌊',
    description: 'رنگ‌های خنک و آرام‌بخش برای تمرکز عمیق، کاهش اضطراب و آرامش کارها'
  },
  {
    id: 'blue',
    name: 'آبی آسمان',
    subtitle: 'افق روشن و انگیزه پایدار',
    primaryHex: '#2563EB',
    accentHex: '#3B82F6',
    gradientHeader: 'from-blue-900 via-blue-800 to-indigo-900',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    activeRing: 'ring-blue-500',
    emoji: '☁️',
    description: 'رنگ کلاسیک برنامه‌ریزی حرفه‌ای، بهره‌وری اداری و نظم ذهنی دقیق'
  },
  {
    id: 'indigo',
    name: 'نیلی شبانه',
    subtitle: 'تمرکز عمیق و تفکر هوشمندانه',
    primaryHex: '#4F46E5',
    accentHex: '#6366F1',
    gradientHeader: 'from-indigo-950 via-indigo-900 to-purple-950',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    activeRing: 'ring-indigo-500',
    emoji: '🌌',
    description: 'رنگ مدرن و متمرکز، مناسب ساعت‌های مطالعه، پژوهش و غرقگی فکری'
  },
  {
    id: 'purple',
    name: 'بنفش ارکیده',
    subtitle: 'خلاقیت، نوآوری و شکوه بصری',
    primaryHex: '#9333EA',
    accentHex: '#A855F7',
    gradientHeader: 'from-purple-950 via-purple-900 to-fuchsia-950',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    activeRing: 'ring-purple-500',
    emoji: '🌸',
    description: 'الهام‌بخش رویاهای بزرگ، تقویت قوه تجسم و طراحی اهداف هنری و خلاقانه'
  },
  {
    id: 'amber',
    name: 'کهربایی غروب',
    subtitle: 'گرمای آفتاب، شور و انرژی روزانه',
    primaryHex: '#D97706',
    accentHex: '#F59E0B',
    gradientHeader: 'from-amber-950 via-amber-800 to-orange-950',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    activeRing: 'ring-amber-500',
    emoji: '☀️',
    description: 'رنگ خورشید و گرما، تقویت اراده برای آغاز صبح‌های پرانرژی و متعهدانه'
  },
  {
    id: 'rose',
    name: 'یاقوتی گل سرخ',
    subtitle: 'عشق به اهداف و اشتیاق آتشین',
    primaryHex: '#E11D48',
    accentHex: '#F43F5E',
    gradientHeader: 'from-rose-950 via-rose-900 to-pink-950',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    activeRing: 'ring-rose-500',
    emoji: '🌹',
    description: 'پرشور و چشم‌گیر، مناسب ایجاد تحول و انرژی مضاعف در پیگیری پروژه‌ها'
  },
  {
    id: 'slate',
    name: 'سنگی مینیمال',
    subtitle: 'سکوت بصری و سادگی مدرن',
    primaryHex: '#475569',
    accentHex: '#64748B',
    gradientHeader: 'from-slate-900 via-slate-800 to-zinc-900',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    activeRing: 'ring-slate-500',
    emoji: '🪨',
    description: 'بدون شلوغی و حواس‌پرتی، انتخابی ایده‌آل برای طرفداران مینیمالیسم خالص'
  }
];

const PRESET_COLORS = [
  { hex: '#10B981', label: 'زمردی' },
  { hex: '#0D9488', label: 'سبز کله‌غازی' },
  { hex: '#3B82F6', label: 'آبی روشن' },
  { hex: '#6366F1', label: 'نیلی' },
  { hex: '#8B5CF6', label: 'بنفش' },
  { hex: '#EC4899', label: 'صورتی' },
  { hex: '#EF4444', label: 'یاقوتی' },
  { hex: '#F59E0B', label: 'کهربایی' },
  { hex: '#D97706', label: 'نارنجی خاکی' },
  { hex: '#84CC16', label: 'لیمویی شاد' },
  { hex: '#06B6D4', label: 'فیروزه‌ای' },
  { hex: '#64748B', label: 'خاکستری مدرن' },
];

const AVAILABLE_ICONS = [
  { name: 'Briefcase', label: 'کار و کسب', icon: Briefcase },
  { name: 'BookOpen', label: 'یادگیری و کتاب', icon: BookOpen },
  { name: 'HeartPulse', label: 'سلامتی و ورزش', icon: HeartPulse },
  { name: 'Home', label: 'خانه و خانواده', icon: Home },
  { name: 'Compass', label: 'مسیر و هدف', icon: Compass },
  { name: 'DollarSign', label: 'مالی و درآمد', icon: DollarSign },
  { name: 'Dumbbell', label: 'بدنسازی و تمرین', icon: Dumbbell },
  { name: 'GraduationCap', label: 'دانشگاه و تحصیل', icon: GraduationCap },
  { name: 'Code', label: 'برنامه‌نویسی و آی‌تی', icon: Code },
  { name: 'Palette', label: 'هنر و خلاقیت', icon: Palette },
  { name: 'Coffee', label: 'سبک زندگی و استراحت', icon: Coffee },
  { name: 'Sparkles', label: 'رشد و معنویت', icon: Sparkles },
  { name: 'Music', label: 'موسیقی و هنر', icon: Music },
  { name: 'Smile', label: 'انرژی و روابط', icon: Smile },
  { name: 'Sun', label: 'انگیزه و نشاط', icon: Sun },
  { name: 'Heart', label: 'عشق و پیوندها', icon: Heart },
];

export const SettingsScreen: React.FC<Props> = ({
  categories,
  goals,
  tasks,
  habits,
  calendarEvents = [],
  userProfile,
  reminderSettings,
  deferredPrompt,
  onInstallClick,
  onSaveUserProfile,
  onSaveReminderSettings,
  onSaveCategory,
  onDeleteCategory,
  onResetCategories,
  onImportTasksOnly,
  onImportAllData,
}) => {
  // Active Navigation Tab for Settings Menu (Default: PROFILE on initial view or restored from localStorage)
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    try {
      const saved = localStorage.getItem('javaneh_settings_active_tab') as SettingsTabId;
      if (['PROFILE', 'REMINDERS', 'THEMES', 'CATEGORIES', 'DATA', 'ALL'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'PROFILE';
  });

  // Color Theme State
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    return userProfile?.themeColor || localStorage.getItem('javaneh_theme_color') || 'emerald';
  });

  // Appearance & Display Preferences with System & Schedule Auto-Dark Mode
  const [darkModePreference, setDarkModePreference] = useState<DarkModePreference>(() => {
    return getDarkModePreference(userProfile);
  });
  const [darkModeSchedule, setDarkModeSchedule] = useState<DarkModeSchedule>(() => {
    return getDarkModeSchedule(userProfile);
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return computeEffectiveDarkMode(getDarkModePreference(userProfile), getDarkModeSchedule(userProfile));
  });
  const [isSystemDark, setIsSystemDark] = useState<boolean>(() => isSystemDarkMode());

  // Listen to system theme / schedule time ticks while in Settings
  useEffect(() => {
    const cleanup = setupThemeListeners(darkModePreference, darkModeSchedule, (effectiveDark) => {
      setIsDarkMode(effectiveDark);
      setIsSystemDark(isSystemDarkMode());
    });
    return cleanup;
  }, [darkModePreference, darkModeSchedule]);

  const [enablePlantAnimations, setEnablePlantAnimations] = useState<boolean>(() => {
    return localStorage.getItem('javaneh_plant_animations') !== 'false';
  });
  const [enableHapticFeedback, setEnableHapticFeedback] = useState<boolean>(() => {
    return localStorage.getItem('javaneh_haptic_feedback') !== 'false';
  });

  // Modal / Form state for Category add/edit
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [catTitle, setCatTitle] = useState('');
  const [catColor, setCatColor] = useState('#10B981');
  const [catPlantType, setCatPlantType] = useState('بونسای');
  const [catIconName, setCatIconName] = useState('Briefcase');

  // Status message for actions
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // APK Download confirmation modal
  const [isApkConfirmModalOpen, setIsApkConfirmModalOpen] = useState(false);
  const [isUpdateAndBackupModalOpen, setIsUpdateAndBackupModalOpen] = useState(false);
  const [backupModalInitialTab, setBackupModalInitialTab] = useState<'FULL_TRANSFER' | 'TASKS_BACKUP' | 'UPDATE_SAFETY' | 'RELEASE_NOTES'>('FULL_TRANSFER');

  // In-app category deletion confirmation modal state
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    title: string;
    linkedGoalsCount: number;
    linkedTasksCount: number;
    linkedHabitsCount: number;
  } | null>(null);

  // Restore Modal State
  const [restoreModal, setRestoreModal] = useState<{
    isOpen: boolean;
    fileName: string;
    fileSizeKb: number;
    exportDate: string;
    data: {
      categories: Category[];
      goals: Goal[];
      tasks: AppTask[];
      habits: Habit[];
      calendarEvents: CalendarEvent[];
      userProfile?: UserProfile;
      reminderSettings?: ReminderSettings;
      appPreferences?: AppPreferences;
    };
    counts: {
      categories: number;
      goals: number;
      tasks: number;
      habits: number;
      calendarEvents: number;
    };
    mode: 'REPLACE' | 'MERGE';
    autoBackupBeforeRestore: boolean;
  } | null>(null);

  const [isTextPasteModalOpen, setIsTextPasteModalOpen] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [isCopyingJson, setIsCopyingJson] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Tab Change with persistence
  const handleTabChange = (tab: SettingsTabId) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('javaneh_settings_active_tab', tab);
    } catch {}
  };

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Sync theme to DOM and UserProfile
  const handleApplyTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    try {
      localStorage.setItem('javaneh_theme_color', themeId);
      document.documentElement.setAttribute('data-app-theme', themeId);
    } catch {}

    if (onSaveUserProfile) {
      const current = userProfile || DEFAULT_USER_PROFILE;
      onSaveUserProfile({
        ...current,
        themeColor: themeId,
        darkMode: isDarkMode,
      });
    }

    const matched = THEME_PALETTES.find(t => t.id === themeId);
    showNotification(`تم «${matched ? matched.name : themeId}» با موفقیت فعال و ذخیره شد.`);
  };

  const handleSelectDarkModePreference = (pref: DarkModePreference) => {
    setDarkModePreference(pref);
    try {
      localStorage.setItem(THEME_STORAGE_KEYS.PREFERENCE, pref);
    } catch {}

    const effective = computeEffectiveDarkMode(pref, darkModeSchedule);
    setIsDarkMode(effective);
    applyDarkMode(effective);

    if (onSaveUserProfile) {
      const current = userProfile || DEFAULT_USER_PROFILE;
      onSaveUserProfile({
        ...current,
        darkMode: effective,
        darkModePreference: pref,
        darkModeSchedule: darkModeSchedule,
        themeColor: selectedThemeId,
      });
    }

    const labels: Record<DarkModePreference, string> = {
      LIGHT: 'حالت روز (روشن) فعال شد.',
      DARK: 'حالت شب (تیره) دائمی فعال شد.',
      SYSTEM: 'هماهنگی خودکار با تم دستگاه/سیستم فعال شد.',
      SCHEDULE: `حالت شب خودکار بر اساس زمان‌بندی (${toPersianDigits(darkModeSchedule.start)} تا ${toPersianDigits(darkModeSchedule.end)}) فعال شد.`,
    };
    showNotification(labels[pref]);
  };

  const handleUpdateSchedule = (start: string, end: string) => {
    const newSchedule = { start, end };
    setDarkModeSchedule(newSchedule);
    try {
      localStorage.setItem(THEME_STORAGE_KEYS.SCHEDULE_START, start);
      localStorage.setItem(THEME_STORAGE_KEYS.SCHEDULE_END, end);
    } catch {}

    const effective = computeEffectiveDarkMode(darkModePreference, newSchedule);
    setIsDarkMode(effective);
    applyDarkMode(effective);

    if (onSaveUserProfile) {
      const current = userProfile || DEFAULT_USER_PROFILE;
      onSaveUserProfile({
        ...current,
        darkModeSchedule: newSchedule,
        darkModePreference,
        darkMode: effective,
        themeColor: selectedThemeId,
      });
    }

    showNotification(`زمان‌بندی حالت شب به ${toPersianDigits(start)} تا ${toPersianDigits(end)} ذخیره شد.`);
  };

  const handleToggleManualPreview = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    applyDarkMode(nextVal);
    const nextPref: DarkModePreference = nextVal ? 'DARK' : 'LIGHT';
    setDarkModePreference(nextPref);
    try {
      localStorage.setItem(THEME_STORAGE_KEYS.PREFERENCE, nextPref);
    } catch {}

    if (onSaveUserProfile) {
      const current = userProfile || DEFAULT_USER_PROFILE;
      onSaveUserProfile({
        ...current,
        darkMode: nextVal,
        darkModePreference: nextPref,
        darkModeSchedule: darkModeSchedule,
        themeColor: selectedThemeId,
      });
    }
    showNotification(nextVal ? 'حالت شب (تیره) فعال شد.' : 'حالت روز (روشن) فعال شد.');
  };

  const handleToggleDarkMode = (dark: boolean) => {
    handleSelectDarkModePreference(dark ? 'DARK' : 'LIGHT');
  };

  const handleTogglePlantAnimations = (enabled: boolean) => {
    setEnablePlantAnimations(enabled);
    try {
      localStorage.setItem('javaneh_plant_animations', enabled ? 'true' : 'false');
    } catch {}
    showNotification(enabled ? 'انیمیشن‌های رشد گیاهان فعال شدند.' : 'انیمیشن‌ها برای صرفه‌جویی در باتری غیرفعال شدند.');
  };

  const handleToggleHaptic = (enabled: boolean) => {
    setEnableHapticFeedback(enabled);
    try {
      localStorage.setItem('javaneh_haptic_feedback', enabled ? 'true' : 'false');
      if (enabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
    } catch {}
    showNotification(enabled ? 'بازخورد لمسی (ویبره کوتاه) فعال شد.' : 'بازخورد لمسی غیرفعال شد.');
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatTitle('');
    setCatColor(PRESET_COLORS[0].hex);
    setCatPlantType(ALL_PLANT_TYPES[0].id);
    setCatIconName('Briefcase');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatTitle(cat.title);
    setCatColor(cat.colorHex || '#10B981');
    setCatPlantType(cat.plantType || ALL_PLANT_TYPES[0].id);
    setCatIconName(cat.iconName || 'Briefcase');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catTitle.trim()) return;

    const categoryToSave: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      title: catTitle.trim(),
      colorHex: catColor,
      plantType: catPlantType,
      iconName: catIconName,
    };

    onSaveCategory(categoryToSave);
    setIsCategoryModalOpen(false);
    showNotification(editingCategory ? 'دسته‌بندی با موفقیت ویرایش شد' : 'دسته‌بندی جدید با موفقیت اضافه شد');
  };

  const handleDeleteCategoryClick = (catId: string, title: string) => {
    if (categories.length <= 1) {
      showNotification('حداقل یک دسته‌بندی باید در برنامه وجود داشته باشد.');
      return;
    }
    const linkedGoalsCount = goals.filter(g => g.categoryId === catId).length;
    const linkedTasksCount = tasks.filter(t => t.categoryId === catId).length;
    const linkedHabitsCount = habits.filter(h => h.categoryId === catId).length;

    setCategoryToDelete({
      id: catId,
      title,
      linkedGoalsCount,
      linkedTasksCount,
      linkedHabitsCount,
    });
  };

  // 1. Export Complete Full-State JSON (Supports Android APK native SAF save + Web Blob + Clipboard)
  const handleExportData = async () => {
    try {
      const todayJ = getTodayJalali();
      const datePart = `${todayJ.year}-${String(todayJ.month).padStart(2, '0')}-${String(todayJ.day).padStart(2, '0')}`;
      const backup = buildCompleteAppBackupPayload({
        categories,
        goals,
        tasks,
        habits,
        calendarEvents,
        userProfile,
        reminderSettings,
        version: APP_VERSION_INFO.currentVersion,
        versionCode: APP_VERSION_INFO.currentVersionCode,
        exportPersianDate: getCurrentPersianDateTimeString(),
      });

      const jsonString = JSON.stringify(backup, null, 2);
      const filename = `javaneh-full-backup-${datePart}.json`;
      const result = await exportBackupFileUniversal(filename, jsonString);
      showNotification(result.message);
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('خطا در تولید فایل پشتیبان.');
    }
  };

  // 1b. Share Complete Backup directly (Android chooser / Web Share)
  const handleShareData = async () => {
    try {
      const todayJ = getTodayJalali();
      const datePart = `${todayJ.year}-${String(todayJ.month).padStart(2, '0')}-${String(todayJ.day).padStart(2, '0')}`;
      const backup = buildCompleteAppBackupPayload({
        categories,
        goals,
        tasks,
        habits,
        calendarEvents,
        userProfile,
        reminderSettings,
        version: APP_VERSION_INFO.currentVersion,
        versionCode: APP_VERSION_INFO.currentVersionCode,
        exportPersianDate: getCurrentPersianDateTimeString(),
      });
      const jsonString = JSON.stringify(backup, null, 2);
      const filename = `javaneh-full-backup-${datePart}.json`;
      const result = await shareBackupFileUniversal(filename, jsonString, 'پشتیبان کامل برنامه جوانه');
      showNotification(result.message);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // 2. Copy Complete JSON string directly to Clipboard
  const handleCopyJsonToClipboard = async () => {
    try {
      const backup = buildCompleteAppBackupPayload({
        categories,
        goals,
        tasks,
        habits,
        calendarEvents,
        userProfile,
        reminderSettings,
        version: APP_VERSION_INFO.currentVersion,
        versionCode: APP_VERSION_INFO.currentVersionCode,
        exportPersianDate: getCurrentPersianDateTimeString(),
      });

      await navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      setIsCopyingJson(true);
      setTimeout(() => setIsCopyingJson(false), 2500);
      showNotification('متن کامل نسخه پشتیبان (شامل همه بخش‌ها: اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، پروفایل و تنظیمات) در کلیپ‌بورد کپی شد.');
    } catch (err) {
      showNotification('خطا در کپی داده‌ها به کلیپ‌بورد.');
    }
  };

  // 3. Parser & Validator for JSON Backup
  const parseAndPrepareBackup = (rawContent: string, fileName = 'داده‌های پشتیبان', fileSizeKb = 0): boolean => {
    const valResult = validateAndSanitizeBackupJson(rawContent);

    if (!valResult.isValid || !valResult.data) {
      showNotification(valResult.fatalError || 'خطای ساختاری در فایل پشتیبان. به منظور حفظ امنیت، هیچ تغییری در داده‌های شما ایجاد نشد.');
      return false;
    }

    setRestoreModal({
      isOpen: true,
      fileName,
      fileSizeKb: fileSizeKb || Math.max(1, Math.round(new Blob([rawContent]).size / 1024)),
      exportDate: valResult.exportDateString || 'معتبر',
      data: valResult.data,
      counts: {
        categories: valResult.counts.categories,
        goals: valResult.counts.goals,
        tasks: valResult.counts.tasks,
        habits: valResult.counts.habits,
        calendarEvents: valResult.counts.calendarEvents,
      },
      mode: 'MERGE',
      autoBackupBeforeRestore: true,
    });

    if (valResult.warnings.length > 0) {
      showNotification(`اعتبارسنجی تایید شد. (${valResult.warnings[0]})`);
    } else {
      showNotification('اعتبارسنجی ساختار فایل پشتیبان کامل با موفقیت انجام شد ✓');
    }

    return true;
  };

  // 4. File input change & Mobile Clipboard Restore
  const handleFileSelect = (file: File) => {
    if (!file) return;
    setIsReadingFile(true);
    showNotification(`در حال خواندن فایل «${file.name}»...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      setIsReadingFile(false);
      const content = e.target?.result as string;
      if (!content || !content.trim()) {
        showNotification('محتوای فایل خالی است یا خوانده نشد.');
        return;
      }
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      parseAndPrepareBackup(content, file.name, sizeKb);
    };
    reader.onerror = (err) => {
      setIsReadingFile(false);
      console.error('File read error:', err);
      showNotification('خطا در خواندن فایل از حافظه گوشی. لطفاً متن فایل را کپی و دستی وارد کنید.');
    };
    try {
      reader.readAsText(file, 'UTF-8');
    } catch (err) {
      setIsReadingFile(false);
      showNotification('امکان بارگذاری این فرمت فایل روی دستگاه وجود ندارد.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  const handlePasteFromClipboardDirectly = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          const success = parseAndPrepareBackup(text.trim(), 'متن کلیپ‌بورد گوشی');
          if (success) return;
        }
      }
      setRawJsonInput('');
      setIsTextPasteModalOpen(true);
      showNotification('کلیپ‌بورد خالی است یا دسترسی خودکار داده نشد؛ کادر ورود دستی باز شد.');
    } catch {
      setRawJsonInput('');
      setIsTextPasteModalOpen(true);
    }
  };

  // 5. Confirm Restore Execution
  const handleConfirmRestore = () => {
    if (!restoreModal || !onImportAllData) return;

    if (restoreModal.autoBackupBeforeRestore) {
      handleExportData();
    }

    onImportAllData(restoreModal.data, restoreModal.mode);

    const modeText = restoreModal.mode === 'REPLACE' ? 'جایگزینی کامل' : 'ترکیب و ادغام';
    showNotification(`اطلاعات با موفقیت به شیوه «${modeText}» بازیابی شدند.`);
    setRestoreModal(null);
  };

  // 6. Text Paste Submission
  const handleTextPasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawJsonInput.trim()) {
      showNotification('لطفاً متن JSON نسخه پشتیبان را وارد کنید.');
      return;
    }
    const success = parseAndPrepareBackup(rawJsonInput.trim(), 'ورودی متنی دستی');
    if (success) {
      setIsTextPasteModalOpen(false);
      setRawJsonInput('');
    }
  };

  // Render Category Icon dynamically
  const renderIcon = (name: string, className = 'w-4 h-4') => {
    const found = AVAILABLE_ICONS.find(i => i.name === name);
    if (!found) return <Briefcase className={className} />;
    const IconComp = found.icon;
    return <IconComp className={className} />;
  };

  const currentProfile = userProfile || DEFAULT_USER_PROFILE;
  const activeTheme = THEME_PALETTES.find(t => t.id === selectedThemeId) || THEME_PALETTES[0];

  // Settings Menu Navigation Items
  const menuItems = [
    {
      id: 'PROFILE' as SettingsTabId,
      label: 'پروفایل کاربری',
      shortLabel: 'پروفایل',
      icon: User,
      badge: currentProfile.name || 'باغبان',
      colorClass: 'emerald'
    },
    {
      id: 'REMINDERS' as SettingsTabId,
      label: 'تنظیمات یادآور و صدا',
      shortLabel: 'یادآورها',
      icon: Bell,
      badge: reminderSettings?.enabled ? 'فعال' : 'خاموش',
      colorClass: 'amber'
    },
    {
      id: 'THEMES' as SettingsTabId,
      label: 'تم‌های رنگی و ظاهر',
      shortLabel: 'تم‌های رنگی',
      icon: Palette,
      badge: activeTheme.name.split(' ')[0],
      colorClass: 'purple'
    },
    {
      id: 'CATEGORIES' as SettingsTabId,
      label: 'دسته‌ها و گیاهان',
      shortLabel: 'دسته‌بندی‌ها',
      icon: Tag,
      badge: `${toPersianDigits(categories.length)} دسته`,
      colorClass: 'teal'
    },
    {
      id: 'DATA' as SettingsTabId,
      label: 'دانلود، پشتیبان‌گیری و پایگاه داده',
      shortLabel: 'دانلود و پشتیبان',
      icon: Database,
      badge: `${toPersianDigits(goals.length + tasks.length + habits.length)} رکورد`,
      colorClass: 'blue'
    },
    {
      id: 'ALL' as SettingsTabId,
      label: 'نمایش یکپارچه (همه بخش‌ها)',
      shortLabel: 'همه بخش‌ها',
      icon: Layers,
      badge: 'کامل',
      colorClass: 'gray'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Sticky Top Header Banner with User Profile Summary */}
      <div className="sticky -top-5 z-20 pt-5 pb-2.5 bg-[#F8F9F5]/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className={`bg-gradient-to-l ${activeTheme.gradientHeader} text-white rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {/* Profile Avatar / Botanical Badge */}
              <div 
                onClick={() => handleTabChange('PROFILE')}
                className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/25 shadow-inner cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0 overflow-hidden"
                title="مشاهده و ویرایش پروفایل"
              >
                {currentProfile.avatarUrl && (currentProfile.avatarUrl.startsWith('data:image') || currentProfile.avatarUrl.startsWith('http')) ? (
                  <img src={currentProfile.avatarUrl} alt="پروفایل" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl select-none">{currentProfile.avatarUrl || '🌱'}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{currentProfile.name || 'باغبان جوانه'}</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                    نسخه {APP_VERSION_INFO.currentVersion}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white/90 border border-white/20">
                    تم: {activeTheme.name}
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                  {currentProfile.title || 'تنظیمات یکپارچه، مدیریت پروفایل، یادآورها، تم‌های رنگی و پایگاه داده'}
                </p>
              </div>
            </div>

            {/* Quick action buttons on banner */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsUpdateAndBackupModalOpen(true)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="پشتیبان‌گیری جامع، اعتبارسنجی و انتقال داده‌ها به گوشی"
              >
                <Database className="w-3.5 h-3.5 text-emerald-200" />
                <span>پشتیبان و انتقال</span>
              </button>

              <button
                type="button"
                onClick={() => setIsApkConfirmModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="دانلود و نصب اپلیکیشن اندروید جوانه (APK) روی گوشی"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>دانلود اپ اندروید (APK)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all animate-fade-in">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Prominent Quick Actions: Download APK & Full Backup Action Box */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50/40 border border-emerald-200/90 rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                <span>دانلود بسته بروزرسانی اندروید (APK) و پشتیبان‌گیری</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  نسخه {toPersianDigits(APP_VERSION_INFO.currentVersion)} (حفظ اطلاعات فعلی)
                </span>
              </h4>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                بروزرسانی مستقیم Javaneh-App.apk (کد نسخه {toPersianDigits(APP_VERSION_INFO.currentVersionCode)}) روی نسخه فعلی گوشی بدون پاک شدن اطلاعات + رفع مشکل ذخیره پروفایل و صدای آلارم یادآورها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsApkConfirmModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="دانلود مستقیم فایل نصبی اندروید (Javaneh-App.apk)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              <span>دانلود بروزرسانی APK</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 bg-white/20 rounded-md text-[10px] font-bold">v{APP_VERSION_INFO.currentVersion}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUpdateAndBackupModalOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="پشتیبان‌گیری جامع، اعتبارسنجی خودکار و انتقال به گوشی"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>پشتیبان‌گیری و انتقال</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- Settings Menu: Interactive Categorized Tab Navigation --- */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-2 sm:p-2.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 px-2 border-b border-gray-100 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>منوی دسته‌بندی تنظیمات</span>
          </div>
          <span className="text-[11px] text-gray-400">
            برای پیمایش سریع و راحت روی گوشی، بخش مورد نظر را لمس کنید
          </span>
        </div>

        {/* Scrollable Navigation Bar (Mobile-first ergonomics) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 border border-gray-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{item.shortLabel}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: USER PROFILE MANAGEMENT (مدیریت پروفایل کاربری) */}
      {/* ========================================================================= */}
      {(activeTab === 'PROFILE' || activeTab === 'ALL') && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
              <span>بخش اول: مدیریت پروفایل کاربری</span>
            </h3>
            <span className="text-[11px] text-gray-400">شناسنامه و نماد شخصی باغبان</span>
          </div>

          {/* Quick Profile Stats Highlight */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-center">
              <span className="text-[10px] text-emerald-800 block">نام نمایشی</span>
              <span className="text-sm font-bold text-emerald-950 mt-0.5 block truncate">
                {currentProfile.name || 'باغبان'}
              </span>
            </div>
            <div className="bg-teal-50/70 border border-teal-200/70 rounded-xl p-3 text-center">
              <span className="text-[10px] text-teal-800 block">اهداف متصل</span>
              <span className="text-sm font-bold text-teal-950 mt-0.5 block">
                {toPersianDigits(goals.length)} هدف فعال
              </span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3 text-center">
              <span className="text-[10px] text-blue-800 block">تسک‌ها و عادات</span>
              <span className="text-sm font-bold text-blue-950 mt-0.5 block">
                {toPersianDigits(tasks.length + habits.length)} مورد
              </span>
            </div>
            <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-3 text-center">
              <span className="text-[10px] text-purple-800 block">تم انتخابی</span>
              <span className="text-sm font-bold text-purple-950 mt-0.5 block truncate">
                {activeTheme.emoji} {activeTheme.name}
              </span>
            </div>
          </div>

          {/* Embedded UserProfileSettings component */}
          {onSaveUserProfile && (
            <UserProfileSettings
              userProfile={userProfile}
              onSaveProfile={onSaveUserProfile}
              onNotify={showNotification}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: REMINDER & GENTLE ALARMS (تنظیمات یادآور و هشدارهای صوتی) */}
      {/* ========================================================================= */}
      {(activeTab === 'REMINDERS' || activeTab === 'ALL') && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <span>بخش دوم: تنظیمات یادآور، آلارم و آوای ملایم</span>
            </h3>
            <span className="text-[11px] text-gray-400">یادآوری‌های صوتی بدون اضطراب</span>
          </div>

          {onSaveReminderSettings && (
            <ReminderAlarmSettings
              reminderSettings={reminderSettings}
              onSaveSettings={onSaveReminderSettings}
              onNotify={showNotification}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: COLOR THEMES & APPEARANCE (تم‌های رنگی و ظاهر برنامه) */}
      {/* ========================================================================= */}
      {(activeTab === 'THEMES' || activeTab === 'ALL') && (
        <div className="bg-white rounded-2xl border border-purple-100/90 p-5 shadow-xs space-y-5 animate-fade-in">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Palette className="w-3.5 h-3.5" />
                </div>
                <span>بخش سوم: تم‌های رنگی و شخصی‌سازی ظاهر برنامه</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                رنگ‌بندی کلی برنامه، حالت روز/شب و افکت‌های بصری باغبانی را مطابق سلیقه خود تنظیم کنید.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-1.5">
                <span>{activeTheme.emoji}</span>
                <span>تم فعلی: {activeTheme.name}</span>
              </span>
            </div>
          </div>

          {/* Interactive Themes Palette Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {THEME_PALETTES.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleApplyTheme(theme.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative group ${
                    isSelected
                      ? `border-emerald-600 bg-gradient-to-b from-white to-emerald-50/40 ring-2 ${theme.activeRing} shadow-sm`
                      : 'border-gray-200/80 bg-white hover:border-emerald-300 hover:shadow-2xs'
                  }`}
                >
                  {/* Top Bar with Emoji and Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl select-none">{theme.emoji}</span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1">
                          <span>{theme.name}</span>
                        </h4>
                        <span className="text-[10px] text-gray-400 block line-clamp-1">
                          {theme.subtitle}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-lg shadow-2xs border border-white"
                      style={{ backgroundColor: theme.primaryHex }}
                      title={`رنگ اصلی: ${theme.primaryHex}`}
                    />
                    <div
                      className="w-6 h-6 rounded-lg shadow-2xs border border-white"
                      style={{ backgroundColor: theme.accentHex }}
                      title={`رنگ مکمل: ${theme.accentHex}`}
                    />
                    <div className="flex-1 text-[10px] text-gray-500 line-clamp-1 mr-1">
                      {theme.description}
                    </div>
                  </div>

                  {/* Active Indicator Button */}
                  <button
                    type="button"
                    className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>تم فعال است</span>
                      </>
                    ) : (
                      <span>انتخاب این تم</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Live Preview Card */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-600" />
                <span>پیش‌نمایش زنده تم انتخابی ({activeTheme.name})</span>
              </span>
              <span className="text-[10px] text-gray-400">نمونه عناصر برنامه</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs text-lg"
                  style={{ backgroundColor: activeTheme.primaryHex }}
                >
                  {activeTheme.emoji}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">باغچه اهداف و عادات سالانه</h5>
                  <p className="text-[11px] text-gray-500">پیشرفت ۷۵٪ در فصل جاری</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  style={{ backgroundColor: activeTheme.primaryHex }}
                  className="px-3 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  دکمه اصلی
                </button>
                <span
                  style={{ color: activeTheme.primaryHex, borderColor: `${activeTheme.primaryHex}40` }}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl border bg-gray-50"
                >
                  برچسب نمونه
                </span>
              </div>
            </div>
          </div>

          {/* Display & Accessibility Options */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-gray-600" />
              <span>تنظیمات حالت نمایش و دسترسی‌پذیری</span>
            </h4>

            {/* Advanced Dark Mode (حالت شب و تم تاریک هوشمند) */}
            <div className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                    isDarkMode ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span>حالت تاریک و تم شب (Dark Mode)</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isDarkMode 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isDarkMode ? '🌙 تم شب فعال است' : '☀️ تم روز فعال است'}
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500">
                      تنظیم خودکار تم تیره بر اساس نور محیط، ساعت شبانه‌روز یا تنظیمات دستگاه
                    </p>
                  </div>
                </div>

                {/* Quick Preview Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleManualPreview}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isDarkMode
                      ? 'bg-purple-900/40 text-purple-200 border-purple-700/60 hover:bg-purple-800/50'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  title="تغییر سریع برای آزمایش تم"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>آزمایش لحظه‌ای ({isDarkMode ? 'تغییر به روز' : 'تغییر به شب'})</span>
                </button>
              </div>

              {/* 4 Mode Selection Segmented Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* 1. Always Light */}
                <button
                  type="button"
                  onClick={() => handleSelectDarkModePreference('LIGHT')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                    darkModePreference === 'LIGHT'
                      ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                      : 'bg-white border-gray-200/80 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">☀️</span>
                    {darkModePreference === 'LIGHT' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">همیشه روشن</span>
                    <span className="text-[10px] text-gray-500">تم روز با نور استاندارد</span>
                  </div>
                </button>

                {/* 2. Always Dark */}
                <button
                  type="button"
                  onClick={() => handleSelectDarkModePreference('DARK')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                    darkModePreference === 'DARK'
                      ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-400 shadow-xs text-white'
                      : 'bg-white border-gray-200/80 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">🌙</span>
                    {darkModePreference === 'DARK' && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">همیشه تیره</span>
                    <span className="text-[10px] text-gray-500">تم شب آرام برای چشم</span>
                  </div>
                </button>

                {/* 3. System Sync */}
                <button
                  type="button"
                  onClick={() => handleSelectDarkModePreference('SYSTEM')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                    darkModePreference === 'SYSTEM'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                      : 'bg-white border-gray-200/80 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">📱</span>
                    {darkModePreference === 'SYSTEM' && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">تنظیمات سیستم</span>
                    <span className="text-[10px] text-gray-500">هماهنگ با گوشی/ویندوز</span>
                  </div>
                </button>

                {/* 4. Schedule */}
                <button
                  type="button"
                  onClick={() => handleSelectDarkModePreference('SCHEDULE')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                    darkModePreference === 'SCHEDULE'
                      ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-300 shadow-xs'
                      : 'bg-white border-gray-200/80 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">⏰</span>
                    {darkModePreference === 'SCHEDULE' && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">بر اساس زمان</span>
                    <span className="text-[10px] text-gray-500">ساعت غروب تا طلوع</span>
                  </div>
                </button>
              </div>

              {/* Dynamic Panel: System details */}
              {darkModePreference === 'SYSTEM' && (
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <span>هماهنگی لحظه‌ای با سیستم‌عامل فعال است</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200/90 text-blue-800 font-bold">
                        {isSystemDark ? 'سیستم شما هم‌اکنون تیره (Dark) است 🌙' : 'سیستم شما هم‌اکنون روشن (Light) است ☀️'}
                      </span>
                    </div>
                    <p className="text-blue-700 text-[11px] leading-relaxed">
                      هنگامی که حالت دارک‌مود در گوشی اندروید یا سیستم شما فعال شود، تم برنامه به طور خودکار بدون نیاز به لمس دکمه تیره می‌شود.
                    </p>
                  </div>
                </div>
              )}

              {/* Dynamic Panel: Schedule details */}
              {darkModePreference === 'SCHEDULE' && (
                <div className="p-3.5 bg-teal-50/80 rounded-xl border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-700" />
                      <span>تنظیم ساعات شبانه (فعال‌سازی خودکار بر اساس زمان)</span>
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      isTimeInSchedule(darkModeSchedule)
                        ? 'bg-teal-200 text-teal-900'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isTimeInSchedule(darkModeSchedule)
                        ? 'هم‌اکنون در بازه شب قرار دارید (تم تیره فعال است 🌙)'
                        : 'هم‌اکنون در بازه روز قرار دارید (تم روشن فعال است ☀️)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Start Time */}
                    <div className="p-2.5 bg-white rounded-lg border border-teal-200 flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span>🌙 شروع حالت شب (غروب):</span>
                      </label>
                      <input
                        type="time"
                        value={darkModeSchedule.start}
                        onChange={(e) => handleUpdateSchedule(e.target.value || '20:00', darkModeSchedule.end)}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-md border border-gray-300 bg-gray-50 focus:bg-white focus:outline-teal-500"
                      />
                    </div>

                    {/* End Time */}
                    <div className="p-2.5 bg-white rounded-lg border border-teal-200 flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span>☀️ پایان حالت شب (صبح):</span>
                      </label>
                      <input
                        type="time"
                        value={darkModeSchedule.end}
                        onChange={(e) => handleUpdateSchedule(darkModeSchedule.start, e.target.value || '06:30')}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-md border border-gray-300 bg-gray-50 focus:bg-white focus:outline-teal-500"
                      />
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-teal-800">پیش‌تنظیم‌های متداول:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSchedule('20:00', '06:30')}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-teal-300 text-teal-900 hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      ۲۰:۰۰ تا ۰۶:۳۰ (استاندارد شبانه)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSchedule('21:00', '07:00')}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-teal-300 text-teal-900 hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      ۲۱:۰۰ تا ۰۷:۰۰ (دیروقت)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSchedule('18:30', '06:00')}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-teal-300 text-teal-900 hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      ۱۸:۳۰ تا ۰۶:۰۰ (زمستانه)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Animation and Haptic Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Plant Growth animations toggle */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">انیمیشن رویش گیاهان</span>
                  <span className="text-[10px] text-gray-500">جلوه‌های بصری شکوفایی</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePlantAnimations(!enablePlantAnimations)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enablePlantAnimations ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform flex items-center justify-center text-[10px] ${
                      enablePlantAnimations ? 'left-1' : 'right-1'
                    }`}
                  >
                    🌱
                  </span>
                </button>
              </div>

              {/* Haptic feedback toggle */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">ویبره و بازخورد لمسی</span>
                  <span className="text-[10px] text-gray-500">لرزش ملایم هنگام تیک زدن</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleHaptic(!enableHapticFeedback)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enableHapticFeedback ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform flex items-center justify-center text-[10px] ${
                      enableHapticFeedback ? 'left-1' : 'right-1'
                    }`}
                  >
                    📳
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: CATEGORIES & BOTANICAL PLANTS (دسته‌بندی‌ها و گیاهان اختصاصی) */}
      {/* ========================================================================= */}
      {(activeTab === 'CATEGORIES' || activeTab === 'ALL') && (
        <div className="bg-white rounded-2xl border border-emerald-100/80 p-5 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>بخش چهارم: دسته‌بندی‌های اهداف و گیاهان اختصاصی</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                هر دسته‌بندی دارای رنگ و گیاه نمادین است که به زیرمجموعه‌ها، تسک‌ها و عادات ارث داده می‌شود.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAddCategory}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>دسته‌بندی جدید</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('آیا مایل به بازنشانی دسته‌بندی‌ها به مقادیر پیش‌فرض هستید؟')) {
                    onResetCategories();
                    showNotification('دسته‌بندی‌ها به حالت اولیه بازنشانی شدند.');
                  }
                }}
                title="بازنشانی دسته‌های اولیه"
                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {categories.map((cat) => {
              const linkedGoals = goals.filter(g => g.categoryId === cat.id);
              const linkedTasks = tasks.filter(t => t.categoryId === cat.id);
              const linkedHabits = habits.filter(h => h.categoryId === cat.id);
              const plantObj = ALL_PLANT_TYPES.find(p => p.id === cat.plantType) || ALL_PLANT_TYPES[0];

              return (
                <div
                  key={cat.id}
                  className="rounded-xl border p-4 bg-white hover:border-emerald-300 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                  style={{ borderRightWidth: '4px', borderRightColor: cat.colorHex }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${cat.colorHex}15`,
                          borderColor: `${cat.colorHex}40`,
                          color: cat.colorHex,
                        }}
                      >
                        {renderIcon(cat.iconName, 'w-4 h-4')}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{cat.title}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: cat.colorHex }}
                            title={`کد رنگ: ${cat.colorHex}`}
                          />
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                          <span>{toPersianDigits(linkedGoals.length)} هدف</span>
                          <span>•</span>
                          <span>{toPersianDigits(linkedTasks.length)} تسک</span>
                          <span>•</span>
                          <span>{toPersianDigits(linkedHabits.length)} عادت</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش دسته‌بندی و گیاه"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategoryClick(cat.id, cat.title)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف دسته‌بندی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Plant details card */}
                  <div className="bg-emerald-50/50 rounded-lg p-2 flex items-center justify-between gap-2 border border-emerald-100/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <PlantIcon type={cat.plantType} size="sm" />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-emerald-950 block truncate">
                          گیاه نمادین: {cat.plantType || 'بونسای'}
                        </span>
                        <span className="text-[10px] text-emerald-800/80 block truncate">
                          {plantObj.description}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: DATA MANAGEMENT & STORAGE (بخش مدیریت داده‌ها و پشتیبان‌گیری) */}
      {/* ========================================================================= */}
      {(activeTab === 'DATA' || activeTab === 'ALL') && (
        <div className="bg-white rounded-2xl border border-blue-100/90 p-5 shadow-xs space-y-5 animate-fade-in">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <span>بخش پنجم: مدیریت داده‌ها، پایگاه داده و پشتیبان‌گیری</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                تهیه نسخه پشتیبان شخصی به صورت فایل استاندارد JSON، کپی سریع، بازیابی داده‌ها و همگام‌سازی ذخیره‌سازی سه‌لایه.
              </p>
            </div>

            {/* Current Entities Summary Badges */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-600" />
                <span>{toPersianDigits(goals.length)} هدف</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                <span>{toPersianDigits(tasks.length)} تسک</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/80 font-semibold flex items-center gap-1">
                <Sprout className="w-3 h-3 text-teal-600" />
                <span>{toPersianDigits(habits.length)} عادت</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>{toPersianDigits((calendarEvents || []).length)} رویداد تقویم</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200/80 font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3 text-purple-600" />
                <span>{toPersianDigits(categories.length)} دسته‌بندی</span>
              </span>
            </div>
          </div>

          {/* Persistence Architecture Status Banner */}
          <div className="bg-gradient-to-r from-blue-50/80 via-emerald-50/50 to-teal-50/60 border border-blue-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-700 text-white shrink-0 mt-0.5 shadow-2xs">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">سامانه ذخیره‌سازی سه‌لایه فعال است</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    همگام با سرور، IndexedDB و LocalStorage
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  تمامی تغییرات شما بلافاصله ذخیره می‌شوند. در تهیه نسخه پشتیبان، ۱۰۰٪ اطلاعات برنامه (اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، عکس و پروفایل کاربری و تنظیمات یادآور) پشتیبانی می‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* Export & Restore Control Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Card 1: Export Backup */}
            <div className="p-4 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 to-white flex flex-col justify-between gap-3 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Download className="w-4 h-4" />
                  </div>
                  <span>تهیه نسخه پشتیبان کامل از کل برنامه (Export)</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  خروجی کامل از تمام بخش‌های برنامه شامل ساختار درختی اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، پروفایل کاربری (به همراه عکس) و تنظیمات یادآور.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ذخیره و دانلود فایل پشتیبان (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareData}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>ارسال و اشتراک‌گذاری (Share)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJsonToClipboard}
                  title="کپی مستقیم کد نسخه پشتیبان در حافظه موقت"
                  className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  {isCopyingJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کپی کد JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBackupModalInitialTab('FULL_TRANSFER');
                    setIsUpdateAndBackupModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="پنل جامع پشتیبان‌گیری، اعتبارسنجی JSON و انتقال بین گوشی و سیستم"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-200" />
                  <span>پنل جامع پشتیبان و انتقال</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsApkConfirmModalOpen(true)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="دانلود و نصب نسخه اندروید (APK) یا وب‌اپلیکیشن (PWA)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>نصب روی گوشی (APK / PWA)</span>
                </button>
              </div>
            </div>

            {/* Card 2: Restore Backup */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-2xs transition-all ${
                isDraggingFile 
                  ? 'border-teal-500 bg-teal-100/50 scale-[1.01]' 
                  : 'border-teal-200/90 bg-gradient-to-br from-teal-50/40 to-white'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-teal-950 font-bold text-xs sm:text-sm">
                  <div className="p-1.5 rounded-lg bg-teal-700 text-white shadow-2xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span>آپلود و بازگردانی کامل اطلاعات (Restore / Import)</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  فایل پشتیبان خود را بارگذاری کنید تا تمام بخش‌ها (اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، پروفایل و تنظیمات) بازیابی شوند.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* Native File Input coupled with label for Android WebView compatibility */}
                <input
                  id="settings-screen-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  onChange={handleFileInputChange}
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  className="sr-only"
                />

                <label
                  htmlFor="settings-screen-file-input"
                  className={`px-3.5 py-2 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    isReadingFile ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  {isReadingFile ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال خواندن فایل...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>انتخاب و آپلود فایل پشتیبان (.json)</span>
                    </>
                  )}
                </label>

                <button
                  type="button"
                  onClick={handlePasteFromClipboardDirectly}
                  className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="خواندن مستقیم و سریع از حافظه کلیپ‌بورد گوشی"
                >
                  <Copy className="w-3.5 h-3.5 text-teal-700" />
                  <span>پیست مستقیم از کلیپ‌بورد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRawJsonInput('');
                    setIsTextPasteModalOpen(true);
                  }}
                  className="px-3 py-2 bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>کادر متنی (Manual Paste)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Philosophy of Javaneh Card */}
      <div className="bg-white rounded-2xl border border-emerald-100/80 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>درباره ساختار و فلسفه برنامه‌ریزی جوانه</span>
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          جوانه یک سیستم برنامه‌ریزی متصل و سلسله‌مراتبی بر اساس تقویم جلالی است:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
            <span className="font-bold text-emerald-900 block mb-1">۱. درخت اهداف سالانه</span>
            <span className="text-emerald-800/80 text-[11px] leading-normal">
              چشم‌اندازهای کلان که با آغاز سال یا در میانه سال کاشته می‌شوند.
            </span>
          </div>
          <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3">
            <span className="font-bold text-teal-900 block mb-1">۲. شاخه‌های فصلی و ماهانه</span>
            <span className="text-teal-800/80 text-[11px] leading-normal">
              شکستن اهداف سالانه به فصل‌های باقیمانده و ماه‌های متناظر با ارث‌بری خودکار دسته و گیاه.
            </span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
            <span className="font-bold text-amber-900 block mb-1">۳. برگ‌های تسک و عادت روزانه</span>
            <span className="text-amber-800/80 text-[11px] leading-normal">
              تسک‌ها و عادات هفتگی و روزانه که با هر تیک زدن، بذر را آبیاری کرده و به بار می‌نشانند.
            </span>
          </div>
        </div>
      </div>

      {/* Modal for Add / Edit Category */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl border border-emerald-100 relative my-8 space-y-4">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 left-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${catColor}15`,
                  borderColor: `${catColor}40`,
                  color: catColor,
                }}
              >
                {renderIcon(catIconName, 'w-4 h-4')}
              </div>
              <h3 className="text-base font-bold text-emerald-950">
                {editingCategory ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}
              </h3>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عنوان دسته‌بندی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  placeholder="مثال: رشد فردی، کسب‌وکار، مهارت‌های فنی..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium outline-hidden"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  <span>انتخاب رنگ دسته‌بندی</span>
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCatColor(c.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        catColor === c.hex ? 'scale-110 border-gray-900 shadow-xs' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {catColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 mr-2">
                    <span className="text-[10px] text-gray-400">کد هگز:</span>
                    <input
                      type="text"
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-[11px] font-mono text-center outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Plant Picker for this category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  <span>انتخاب گیاه نمادین این دسته‌بندی</span>
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-gray-200 rounded-xl bg-gray-50/50">
                  {ALL_PLANT_TYPES.map((plant) => {
                    const isSelected = catPlantType === plant.id;
                    return (
                      <button
                        key={plant.id}
                        type="button"
                        onClick={() => setCatPlantType(plant.id)}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white border-gray-200 hover:border-emerald-200'
                        }`}
                      >
                        <PlantIcon type={plant.id} size="sm" />
                        <span className="text-[10px] font-bold text-emerald-950 truncate w-full block">
                          {plant.id}
                        </span>
                        <span className="text-[9px] text-gray-400 truncate w-full block">
                          {plant.description.split('،')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  انتخاب آیکون نمایشی
                </label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1 border border-gray-200 rounded-xl bg-gray-50/50">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = catIconName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setCatIconName(item.name)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview of Category Badge */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">پیش‌نمایش برچسب:</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-2xs"
                    style={{
                      backgroundColor: `${catColor}15`,
                      color: catColor,
                      borderColor: `${catColor}40`,
                    }}
                  >
                    {renderIcon(catIconName, 'w-3.5 h-3.5')}
                    <span>{catTitle || 'عنوان دسته‌بندی'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-900 bg-white border border-emerald-200 px-2 py-0.5 rounded-lg">
                    <PlantIcon type={catPlantType} size="xs" />
                    <span>{catPlantType}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {editingCategory ? 'ذخیره تغییرات' : 'افزودن دسته‌بندی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-rose-100 text-right space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900">حذف دسته‌بندی</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              آیا از حذف دسته‌بندی <strong>«{categoryToDelete.title}»</strong> مطمئن هستید؟
            </p>
            {(categoryToDelete.linkedGoalsCount > 0 || categoryToDelete.linkedTasksCount > 0 || categoryToDelete.linkedHabitsCount > 0) && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                توجه: موارد متصل به این دسته ({categoryToDelete.linkedGoalsCount} هدف، {categoryToDelete.linkedTasksCount} تسک، {categoryToDelete.linkedHabitsCount} عادت) پس از حذف، به دسته‌بندی دیگر منتقل خواهند شد.
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  showNotification(`دسته‌بندی «${categoryToDelete.title}» با موفقیت حذف شد`);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                حذف قطعی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Preview & Confirmation Dialog */}
      {restoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-emerald-100 text-right overflow-hidden animate-scale-up my-6">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-emerald-950">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900">پیش‌نمایش و تایید بازگردانی کامل اطلاعات</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">بررسی محتویات فایل پشتیبان پیش از اعمال در تمام بخش‌های برنامه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-800">نام فایل / مبدا:</span>
                  <span className="font-mono text-emerald-900 dir-ltr">{restoreModal.fileName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>حجم تقریبی فایل:</span>
                  <span className="font-semibold text-gray-800">{toPersianDigits(restoreModal.fileSizeKb)} کیلوبایت</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>تاریخ ثبت خروجی:</span>
                  <span className="font-semibold text-gray-800">{restoreModal.exportDate}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-900 block mb-2">رکوردهای شناسایی‌شده در این نسخه پشتیبان:</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-800 block">اهداف</span>
                    <span className="text-sm font-black text-emerald-950 mt-0.5 block">{toPersianDigits(restoreModal.counts.goals)}</span>
                    <span className="text-[9px] text-gray-500">فعلی: {toPersianDigits(goals.length)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-200 text-center">
                    <span className="text-[10px] text-blue-800 block">تسک‌ها</span>
                    <span className="text-sm font-black text-blue-950 mt-0.5 block">{toPersianDigits(restoreModal.counts.tasks)}</span>
                    <span className="text-[9px] text-gray-500">فعلی: {toPersianDigits(tasks.length)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-teal-50/80 border border-teal-200 text-center">
                    <span className="text-[10px] text-teal-800 block">عادات</span>
                    <span className="text-sm font-black text-teal-950 mt-0.5 block">{toPersianDigits(restoreModal.counts.habits)}</span>
                    <span className="text-[9px] text-gray-500">فعلی: {toPersianDigits(habits.length)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-800 block">رویداد تقویم</span>
                    <span className="text-sm font-black text-amber-950 mt-0.5 block">{toPersianDigits(restoreModal.counts.calendarEvents)}</span>
                    <span className="text-[9px] text-gray-500">فعلی: {toPersianDigits((calendarEvents || []).length)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200 text-center">
                    <span className="text-[10px] text-purple-800 block">دسته‌ها</span>
                    <span className="text-sm font-black text-purple-950 mt-0.5 block">{toPersianDigits(restoreModal.counts.categories)}</span>
                    <span className="text-[9px] text-gray-500">فعلی: {toPersianDigits(categories.length)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-800 block">پروفایل</span>
                    <span className="text-xs font-black text-emerald-950 mt-1 block">{restoreModal.data.userProfile ? 'دارد ✓' : 'پیش‌فرض'}</span>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2 pt-1">
                <span className="font-bold text-gray-900 block">انتخاب شیوه بازگردانی:</span>
                
                <div 
                  onClick={() => setRestoreModal({ ...restoreModal, mode: 'MERGE' })}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    restoreModal.mode === 'MERGE' 
                      ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' 
                      : 'border-gray-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 border flex items-center justify-center ${
                    restoreModal.mode === 'MERGE' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                  }`}>
                    {restoreModal.mode === 'MERGE' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">ترکیب و ادغام هوشمند (Merge)</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">پیشنهادی</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      داده‌های جدید بدون حذف اطلاعات فعلی اضافه شده و رکوردهای یکسان به‌روزرسانی می‌شوند. کارهای فعلی پاک نخواهند شد.
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => setRestoreModal({ ...restoreModal, mode: 'REPLACE' })}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    restoreModal.mode === 'REPLACE' 
                      ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500' 
                      : 'border-gray-200 hover:border-amber-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 border flex items-center justify-center ${
                    restoreModal.mode === 'REPLACE' ? 'border-amber-600 bg-amber-600 text-white' : 'border-gray-300'
                  }`}>
                    {restoreModal.mode === 'REPLACE' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">جایگزینی کامل (Clean Replace)</span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">حذف داده‌های فعلی</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      تمام داده‌های فعلی حذف شده و دقیقاً محتویات این فایل پشتیبان به عنوان اطلاعات اصلی در برنامه قرار می‌گیرد.
                    </p>
                  </div>
                </div>
              </div>

              {/* Safety Option: Auto Backup Before Restore */}
              <label className="flex items-center gap-2.5 pt-1 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreModal.autoBackupBeforeRestore}
                  onChange={(e) => setRestoreModal({ ...restoreModal, autoBackupBeforeRestore: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-[11px] text-emerald-950 font-medium leading-relaxed">
                  پیش از اعمال بازگردانی، یک نسخه پشتیبان اضطراری از وضعیت فعلی برنامه به صورت خودکار ذخیره شود.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRestoreModal(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تایید و اجرای بازگردانی کامل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual JSON Text Paste Dialog */}
      {isTextPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-teal-100 text-right overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-teal-50/70 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-teal-950">
                <div className="p-2 rounded-xl bg-teal-700 text-white shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900">ورود متنی اطلاعات نسخه پشتیبان (JSON)</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">الصاق مستقیم متن کپی شده از فایل پشتیبان جوانه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTextPasteModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTextPasteSubmit} className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    کد یا متن JSON پشتیبان:
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (navigator.clipboard && navigator.clipboard.readText) {
                          const text = await navigator.clipboard.readText();
                          if (text && text.trim()) {
                            setRawJsonInput(text.trim());
                            showNotification('متن با موفقیت از کلیپ‌بورد درج شد ✓');
                            return;
                          }
                        }
                        showNotification('متنی در کلیپ‌بورد یافت نشد.');
                      } catch {
                        showNotification('لطفاً متن را دستی در کادر پیست نمایید.');
                      }
                    }}
                    className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>الصاق از کلیپ‌بورد</span>
                  </button>
                </div>
                <textarea
                  value={rawJsonInput}
                  onChange={(e) => setRawJsonInput(e.target.value)}
                  placeholder={`{\n  "appName": "جوانه (Javaneh)",\n  "version": "2.4.0",\n  "categories": [...],\n  "goals": [...],\n  "tasks": [...],\n  "habits": [...],\n  "calendarEvents": [...]\n}`}
                  rows={8}
                  dir="ltr"
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-xs text-gray-800 bg-gray-50/50"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  می‌توانید کدی که قبلاً با دکمه «کپی کد JSON» ذخیره کرده بودید را در این کادر پیست کنید.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTextPasteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>بررسی و پیش‌نمایش</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Pre-Update Backup, Tasks Backup & Google Play Release Notes Modal */}
      <UpdateAndBackupModal
        isOpen={isUpdateAndBackupModalOpen}
        onClose={() => setIsUpdateAndBackupModalOpen(false)}
        initialTab={backupModalInitialTab}
        tasks={tasks}
        goals={goals}
        habits={habits}
        categories={categories}
        calendarEvents={calendarEvents}
        userProfile={userProfile}
        reminderSettings={reminderSettings}
        onImportTasksOnly={onImportTasksOnly}
        onImportAllData={onImportAllData}
        onOpenFullApkDownload={() => setIsApkConfirmModalOpen(true)}
      />

      {/* Direct APK / PWA Install Modal with safe handling */}
      <ApkDownloadConfirmModal
        isOpen={isApkConfirmModalOpen}
        onClose={() => setIsApkConfirmModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallClick={onInstallClick}
      />
    </div>
  );
};
