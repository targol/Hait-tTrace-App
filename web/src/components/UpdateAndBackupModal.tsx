import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Upload, 
  Database, 
  CheckCircle2, 
  FileCheck, 
  Sparkles, 
  Smartphone, 
  HardDrive, 
  Info, 
  Clock, 
  ArrowRight, 
  ArrowLeftRight, 
  FileText, 
  RotateCcw,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { AppTask, Goal, Habit, Category, UserProfile, ReminderSettings, CalendarEvent, AppPreferences } from '../types';
import { APP_VERSION_INFO, RELEASE_HISTORY } from '../version';
import { 
  saveLocalSnapshot, 
  getOrCreateUserId, 
  buildCompleteAppBackupPayload,
  exportBackupFileUniversal,
  shareBackupFileUniversal
} from '../services/storageService';
import { validateAndSanitizeBackupJson, ValidationEntityCounts } from '../services/backupValidationService';
import { toPersianDigits, getTodayJalali, getCurrentPersianDateTimeString } from '../calendar/jalali';

export interface FullBackupPayload {
  appName: string;
  dataType?: string;
  version: string;
  versionCode?: number;
  exportDate: string;
  exportPersianDate: string;
  userId?: string;
  counts?: {
    categories: number;
    goals: number;
    tasks: number;
    habits: number;
    calendarEvents?: number;
    customSounds?: number;
  };
  categories?: Category[];
  goals?: Goal[];
  tasks?: AppTask[];
  habits?: Habit[];
  calendarEvents?: CalendarEvent[];
  userProfile?: UserProfile;
  reminderSettings?: ReminderSettings;
  appPreferences?: AppPreferences;
  data?: {
    categories?: Category[];
    goals?: Goal[];
    tasks?: AppTask[];
    habits?: Habit[];
    calendarEvents?: CalendarEvent[];
    userProfile?: UserProfile;
    reminderSettings?: ReminderSettings;
    appPreferences?: AppPreferences;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: AppTask[];
  goals: Goal[];
  habits: Habit[];
  categories: Category[];
  calendarEvents?: CalendarEvent[];
  userProfile?: UserProfile;
  reminderSettings?: ReminderSettings;
  initialTab?: 'FULL_TRANSFER' | 'UPDATE_SAFETY' | 'TASKS_BACKUP' | 'RELEASE_NOTES';
  onImportTasksOnly?: (tasks: AppTask[], mode: 'REPLACE' | 'MERGE') => void;
  onImportAllData?: (data: {
    categories?: Category[];
    goals?: Goal[];
    tasks?: AppTask[];
    habits?: Habit[];
    calendarEvents?: CalendarEvent[];
    userProfile?: UserProfile;
    reminderSettings?: ReminderSettings;
    appPreferences?: AppPreferences;
  }, mode: 'REPLACE' | 'MERGE') => void;
  onOpenFullApkDownload?: () => void;
}

export const UpdateAndBackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tasks,
  goals,
  habits,
  categories,
  calendarEvents = [],
  userProfile,
  reminderSettings,
  initialTab = 'FULL_TRANSFER',
  onImportTasksOnly,
  onImportAllData,
  onOpenFullApkDownload,
}) => {
  const [activeTab, setActiveTab] = useState<'FULL_TRANSFER' | 'UPDATE_SAFETY' | 'TASKS_BACKUP' | 'RELEASE_NOTES'>(initialTab);

  // Sync tab if initialTab changes when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [isCopiedJson, setIsCopiedJson] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  const fullFileInputRef = useRef<HTMLInputElement>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  // Full transfer import state
  const [fullImportFile, setFullImportFile] = useState<File | null>(null);
  const [fullImportData, setFullImportData] = useState<FullBackupPayload | null>(null);
  const [fullImportMode, setFullImportMode] = useState<'REPLACE' | 'MERGE'>('MERGE');
  const [fullImportError, setFullImportError] = useState<string | null>(null);
  const [fullImportSuccess, setFullImportSuccess] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationCounts, setValidationCounts] = useState<ValidationEntityCounts | null>(null);
  const [validationDate, setValidationDate] = useState<string | null>(null);
  const [pastedJsonInput, setPastedJsonInput] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Task-only import state
  const [taskImportFile, setTaskImportFile] = useState<File | null>(null);
  const [taskImportData, setTaskImportData] = useState<AppTask[] | null>(null);
  const [taskImportMode, setTaskImportMode] = useState<'REPLACE' | 'MERGE'>('MERGE');
  const [taskImportError, setTaskImportError] = useState<string | null>(null);
  const [taskImportSuccess, setTaskImportSuccess] = useState<string | null>(null);
  const [isCopiedTaskJson, setIsCopiedTaskJson] = useState(false);
  const [showTaskPasteBox, setShowTaskPasteBox] = useState(false);
  const [pastedTaskJsonInput, setPastedTaskJsonInput] = useState('');

  if (!isOpen) return null;

  const userId = getOrCreateUserId();

  // Create complete full-state backup JSON object (Tasks + Goals + Habits + Categories + CalendarEvents + UserProfile + ReminderSettings + AppPreferences)
  const buildFullBackupPayload = (): FullBackupPayload => {
    return buildCompleteAppBackupPayload({
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
  };

  // 1. Export & Download Full Backup (supports Android APK native file save, Web Blob, and Clipboard fallback)
  const handleExportFullBackup = async () => {
    try {
      const todayJ = getTodayJalali();
      const datePart = `${todayJ.year}-${String(todayJ.month).padStart(2, '0')}-${String(todayJ.day).padStart(2, '0')}`;
      const payload = buildFullBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const filename = `javaneh-full-backup-${datePart}.json`;

      const result = await exportBackupFileUniversal(filename, jsonString);
      setBackupSuccessMessage(result.message);
      setTimeout(() => setBackupSuccessMessage(null), 6000);
    } catch (e) {
      console.error(e);
      setBackupSuccessMessage('خطا در تهیه نسخه پشتیبان.');
    }
  };

  // 1b. Direct Native Share (Android Share chooser, Web Share API, or Clipboard fallback)
  const handleShareFullBackup = async () => {
    try {
      const todayJ = getTodayJalali();
      const datePart = `${todayJ.year}-${String(todayJ.month).padStart(2, '0')}-${String(todayJ.day).padStart(2, '0')}`;
      const payload = buildFullBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const filename = `javaneh-full-backup-${datePart}.json`;

      const result = await shareBackupFileUniversal(filename, jsonString, 'پشتیبان کامل برنامه جوانه');
      setBackupSuccessMessage(result.message);
      setTimeout(() => setBackupSuccessMessage(null), 6000);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Copy Full Backup JSON directly to Clipboard
  const handleCopyFullBackupToClipboard = async () => {
    try {
      const payload = buildFullBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setIsCopiedJson(true);
      setBackupSuccessMessage('متن کامل نسخه پشتیبان (شامل اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، پروفایل و تنظیمات) کپی شد!');
      setTimeout(() => setIsCopiedJson(false), 3000);
      setTimeout(() => setBackupSuccessMessage(null), 6000);
    } catch (err) {
      setShowPasteBox(true);
      setPastedJsonInput(JSON.stringify(buildFullBackupPayload(), null, 2));
      setBackupSuccessMessage('کد پشتیبان در کادر پایین قرار گرفت؛ می‌توانید آن را کپی کنید.');
    }
  };

  // 2b. Auto-paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setPastedJsonInput(text);
          parseFullBackupString(text.trim(), 'حافظه موقت');
          return;
        }
      }
      setShowPasteBox(true);
      setFullImportError('برای بارگذاری از کلیپ‌بورد، لطفاً کد کپی‌شده را در کادر متنی پایین پیست (Paste) نمایید.');
    } catch (err) {
      setShowPasteBox(true);
      setFullImportError('لطفاً کد کپی‌شده را در کادر متنی پایین پیست (Paste) نمایید.');
    }
  };

  // 3. Deep Validate & Parse Full Backup content (from file or text)
  const parseFullBackupString = (content: string, sourceName = 'فایل پشتیبان') => {
    setFullImportError(null);
    setFullImportSuccess(null);
    setValidationWarnings([]);

    const validationResult = validateAndSanitizeBackupJson(content);

    if (!validationResult.isValid || !validationResult.data) {
      setFullImportError(validationResult.fatalError || 'خطای ساختاری در فایل JSON پشتیبان. جهت محافظت از اطلاعات فعلی شما، از اعمال آن جلوگیری شد.');
      setFullImportData(null);
      setValidationCounts(null);
      setValidationDate(null);
      return;
    }

    setFullImportData({
      appName: validationResult.appName || 'جوانه',
      version: APP_VERSION_INFO.currentVersion,
      exportDate: new Date().toISOString(),
      exportPersianDate: validationResult.exportDateString || '',
      counts: {
        categories: validationResult.counts.categories,
        goals: validationResult.counts.goals,
        tasks: validationResult.counts.tasks,
        habits: validationResult.counts.habits,
        calendarEvents: validationResult.counts.calendarEvents,
      },
      ...validationResult.data,
    });
    setValidationWarnings(validationResult.warnings);
    setValidationCounts(validationResult.counts);
    setValidationDate(validationResult.exportDateString || 'معتبر');
    setPastedJsonInput('');
    setShowPasteBox(false);
  };

  // 4. File input for Full Restore
  const handleFullFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFullImportFile(file);
    setFullImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        setFullImportError('محتوای فایل انتخاب‌شده خالی است.');
        return;
      }
      parseFullBackupString(text, file.name);
    };
    reader.onerror = () => {
      setFullImportError('خطا در خواندن فایل از حافظه گوشی. لطفاً متن فایل را دستی پیست کنید.');
    };
    try {
      reader.readAsText(file, 'UTF-8');
    } catch {
      setFullImportError('امکان خواندن این فایل روی دستگاه وجود ندارد.');
    }
    e.target.value = '';
  };

  // 5. Confirm Full Restore Execution with Auto Emergency Snapshot
  const handleConfirmFullImport = () => {
    if (!fullImportData || !onImportAllData) {
      setFullImportError('خطا: داده‌های معتبری برای بازیابی وجود ندارد.');
      return;
    }

    // Safety Guarantee: Always create an emergency snapshot of CURRENT state before applying any import!
    saveLocalSnapshot({
      categories,
      goals,
      tasks,
      habits,
      calendarEvents,
      userProfile,
      reminderSettings,
    });

    onImportAllData(
      {
        categories: fullImportData.categories,
        goals: fullImportData.goals,
        tasks: fullImportData.tasks,
        habits: fullImportData.habits,
        calendarEvents: fullImportData.calendarEvents,
        userProfile: fullImportData.userProfile,
        reminderSettings: fullImportData.reminderSettings,
        appPreferences: fullImportData.appPreferences,
      },
      fullImportMode
    );

    const modeText = fullImportMode === 'REPLACE' ? 'جایگزینی کامل' : 'ترکیب و ادغام هوشمند';
    setFullImportSuccess(`تمامی بخش‌ها (اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، پروفایل و تنظیمات) با موفقیت به شیوه «${modeText}» بازیابی و ذخیره شدند.`);
    setFullImportData(null);
    setFullImportFile(null);
    setValidationWarnings([]);
    setValidationCounts(null);
    setTimeout(() => {
      setFullImportSuccess(null);
      onClose();
    }, 2800);
  };

  // 6. Task-only Fast Export
  const handleExportTasksOnly = async () => {
    try {
      const todayJ = getTodayJalali();
      const datePart = `${todayJ.year}-${String(todayJ.month).padStart(2, '0')}-${String(todayJ.day).padStart(2, '0')}`;
      const payload = {
        appName: 'جوانه (Javaneh)',
        dataType: 'TASKS_ONLY_BACKUP',
        version: APP_VERSION_INFO.currentVersion,
        exportDate: new Date().toISOString(),
        exportPersianDate: getCurrentPersianDateTimeString(),
        userId,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.isCompleted).length,
        tasks,
      };

      const jsonString = JSON.stringify(payload, null, 2);
      const filename = `javaneh-tasks-${datePart}.json`;
      const result = await exportBackupFileUniversal(filename, jsonString);
      setBackupSuccessMessage(result.message);
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (e) {
      console.error(e);
      setBackupSuccessMessage('خطا در تهیه نسخه پشتیبان تسک‌ها');
    }
  };

  // 6b. Copy Tasks-only JSON to clipboard
  const handleCopyTasksJsonToClipboard = async () => {
    try {
      const payload = {
        appName: 'جوانه (Javaneh)',
        dataType: 'TASKS_ONLY_BACKUP',
        version: APP_VERSION_INFO.currentVersion,
        exportDate: new Date().toISOString(),
        exportPersianDate: getCurrentPersianDateTimeString(),
        userId,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.isCompleted).length,
        tasks,
      };
      const jsonString = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setIsCopiedTaskJson(true);
      setBackupSuccessMessage(`کد JSON تسک‌ها (${toPersianDigits(tasks.length)} تسک) در حافظه کپی شد.`);
      setTimeout(() => setIsCopiedTaskJson(false), 3000);
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (err) {
      setBackupSuccessMessage('خطا در کپی متن به کلیپ‌بورد.');
    }
  };

  // 6c. Parse Tasks JSON from String (File or Paste)
  const parseTasksJsonString = (text: string, sourceName = 'فایل تسک‌ها') => {
    setTaskImportError(null);
    setTaskImportSuccess(null);
    try {
      const parsed = JSON.parse(text);
      let rawList: any[] = [];
      if (Array.isArray(parsed.tasks)) {
        rawList = parsed.tasks;
      } else if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (Array.isArray(parsed?.data?.tasks)) {
        rawList = parsed.data.tasks;
      }

      if (rawList.length === 0) {
        setTaskImportError('هیچ تسک معتبری در این فایل یا متن یافت نشد.');
        setTaskImportData(null);
        return;
      }

      const sanitizedTasks: AppTask[] = rawList
        .filter(t => t && typeof t === 'object' && typeof t.title === 'string' && t.title.trim().length > 0)
        .map((t, idx) => ({
          ...t,
          id: String(t.id || `task_import_${Date.now()}_${idx}`),
          title: String(t.title).trim(),
          isCompleted: Boolean(t.isCompleted),
          repeatDaysOfWeek: Array.isArray(t.repeatDaysOfWeek) ? t.repeatDaysOfWeek : [],
        }));

      if (sanitizedTasks.length === 0) {
        setTaskImportError('عناوین تسک‌ها در ساختار JSON معتبر نیست.');
        setTaskImportData(null);
        return;
      }

      setTaskImportData(sanitizedTasks);
      setShowTaskPasteBox(false);
      setPastedTaskJsonInput('');
    } catch (err) {
      setTaskImportError('متن یا فایل واردشده دارای ساختار معتبر JSON نیست.');
      setTaskImportData(null);
    }
  };

  // 7. Task-only file input selection
  const handleTaskFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTaskImportFile(file);
    setTaskImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        setTaskImportError('محتوای فایل انتخاب‌شده خالی است.');
        return;
      }
      parseTasksJsonString(text, file.name);
    };
    reader.onerror = () => {
      setTaskImportError('خطا در خواندن فایل از حافظه گوشی.');
    };
    try {
      reader.readAsText(file, 'UTF-8');
    } catch {
      setTaskImportError('امکان خواندن این فایل روی دستگاه وجود ندارد.');
    }
  };

  // 8. Confirm Task-only restore
  const handleConfirmTaskImport = () => {
    if (!taskImportData || !onImportTasksOnly) return;
    onImportTasksOnly(taskImportData, taskImportMode);
    setTaskImportSuccess(`تعداد ${toPersianDigits(taskImportData.length)} تسک با موفقیت ${taskImportMode === 'REPLACE' ? 'جایگزین' : 'ادغام'} شدند.`);
    setTaskImportData(null);
    setTaskImportFile(null);
    setTimeout(() => setTaskImportSuccess(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <ArrowLeftRight className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span>پشتیبان‌گیری و انتقال داده‌ها به گوشی</span>
                <span className="text-[10px] bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full border border-white/20">
                  انتقال به موبایل
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100/90 mt-0.5">
                تهیه خروجی کامل، ارسال به گوشی و بارگذاری روان اطلاعات در تمام دستگاه‌ها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-200 bg-gray-50/70 p-1.5 gap-1 shrink-0 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('FULL_TRANSFER')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'FULL_TRANSFER'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>پشتیبان و انتقال کامل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TASKS_BACKUP')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'TASKS_BACKUP'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4 text-teal-600" />
            <span>بکاپ تسک‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UPDATE_SAFETY')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'UPDATE_SAFETY'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>امنیت و آپدیت APK</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RELEASE_NOTES')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'RELEASE_NOTES'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>تغییرات نسخه‌ها</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {backupSuccessMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupSuccessMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: FULL DATA BACKUP & MOBILE TRANSFER */}
          {activeTab === 'FULL_TRANSFER' && (
            <div className="space-y-4">
              
              {/* Quick Step-by-Step Mobile Transfer Banner */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>راهنمای انتقال سریع اطلاعات از این سیستم به گوشی:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-700">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-emerald-900 block font-bold">۱. تهیه فایل یا کد:</strong>
                    <p className="text-gray-600 text-[10px] leading-relaxed">
                      روی دکمه «دانلود فایل پشتیبان» کلیک کرده یا «کپی کد انتقال» را بزنید.
                    </p>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-emerald-900 block font-bold">۲. ارسال به گوشی:</strong>
                    <p className="text-gray-600 text-[10px] leading-relaxed">
                      فایل یا متن کپی‌شده را در پیام‌رسان (ایتا، بله، تلگرام، واتساپ یا ایمیل) برای خود بفرستید.
                    </p>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                    <strong className="text-emerald-900 block font-bold">۳. بارگذاری در گوشی:</strong>
                    <p className="text-gray-600 text-[10px] leading-relaxed">
                      در گوشی، در همین صفحه دکمه «آپلود فایل» یا «پیست کد» را بزنید و تایید کنید!
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Summary Stats */}
              <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-500 font-medium">اهداف</div>
                  <div className="text-sm font-black text-emerald-900">{toPersianDigits(goals.length)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-500 font-medium">وظایف و تسک‌ها</div>
                  <div className="text-sm font-black text-emerald-900">{toPersianDigits(tasks.length)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-500 font-medium">عادت‌ها</div>
                  <div className="text-sm font-black text-emerald-900">{toPersianDigits(habits.length)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-500 font-medium">رویدادهای تقویم</div>
                  <div className="text-sm font-black text-emerald-900">{toPersianDigits((calendarEvents || []).length)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-500 font-medium">دسته‌بندی‌ها</div>
                  <div className="text-sm font-black text-emerald-900">{toPersianDigits(categories.length)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-500 font-medium">پروفایل و تنظیمات</div>
                  <div className="text-xs font-black text-emerald-700 mt-0.5">کامل ✓</div>
                </div>
              </div>

              {/* Section A: EXPORT & BACKUP */}
              <div className="border border-emerald-200 bg-white rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">خروجی کامل از تمام اطلاعات برنامه (همه بخش‌ها)</h4>
                      <p className="text-[10px] text-gray-500">شامل اهداف، تسک‌ها، عادت‌ها، رویدادهای تقویم، دسته‌بندی‌ها، عکس و پروفایل کاربری، زنگ‌های یادآور و تنظیمات</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportFullBackup}
                    className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>ذخیره و دانلود فایل پشتیبان (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareFullBackup}
                    title="اشتراک‌گذاری مستقیم فایل یا ارسال به پیام‌رسان‌ها و گوگل‌درایو"
                    className="p-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>ارسال و اشتراک‌گذاری (Share)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyFullBackupToClipboard}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    {isCopiedJson ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                    <span>{isCopiedJson ? 'کد انتقال کپی شد!' : 'کپی کد متنی (JSON)'}</span>
                  </button>
                </div>
              </div>

              {/* Section B: IMPORT & UPLOAD */}
              <div className="border border-teal-200 bg-teal-50/30 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">آپلود و بازیابی کامل اطلاعات (در گوشی یا سیستم)</h4>
                      <p className="text-[10px] text-gray-500">انتخاب فایل پشتیبان از حافظه دستگاه یا پیست کردن کد انتقال</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Native File Input coupled with label for 100% Android WebView compatibility */}
                  <input
                    id="full-backup-file-input"
                    ref={fullFileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={handleFullFileSelect}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    className="sr-only"
                  />

                  <label
                    htmlFor="full-backup-file-input"
                    className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95 select-none"
                  >
                    <Upload className="w-4 h-4" />
                    <span>انتخاب و آپلود فایل پشتیبان (.json)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    title="خواندن مستقیم کد کپی‌شده از حافظه کلیپ‌بورد گوشی"
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>پیست خودکار از حافظه</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteBox(!showPasteBox)}
                    className="px-3.5 py-2.5 bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-700" />
                    <span>{showPasteBox ? 'بستن کادر دستی' : 'وارد کردن دستی کد'}</span>
                  </button>
                </div>

                {/* Paste Code Box */}
                {showPasteBox && (
                  <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-gray-700 block">
                        متن کد پشتیبان (JSON) را اینجا پیست (Paste) کنید:
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="text-[11px] text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                      >
                        پیست از کلیپ‌بورد
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={pastedJsonInput}
                      onChange={(e) => setPastedJsonInput(e.target.value)}
                      placeholder='{"appName": "جوانه (Javaneh)", "data": ...}'
                      className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-mono text-left dir-ltr bg-gray-50 focus:bg-white focus:border-teal-500 outline-hidden"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!pastedJsonInput.trim()) {
                            setFullImportError('لطفاً ابتدا متن را در کادر پیست کنید.');
                            return;
                          }
                          parseFullBackupString(pastedJsonInput.trim(), 'متن کپی شده');
                        }}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        اعتبارسنجی و لود اطلاعات
                      </button>
                    </div>
                  </div>
                )}

                {/* Error feedback with explicit data protection guarantee */}
                {fullImportError && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl text-xs space-y-2 animate-fade-in shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>توجه در خواندن داده پشتیبان</span>
                    </div>
                    <p className="text-rose-700 leading-relaxed font-medium">
                      {fullImportError}
                    </p>
                    <div className="pt-1.5 border-t border-rose-200/80 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>محافظت کامل داده‌ها: داده‌های فعلی شما کاملاً دست‌نخورده حفظ گردیدند.</span>
                    </div>
                  </div>
                )}

                {/* Success feedback */}
                {fullImportSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{fullImportSuccess}</span>
                  </div>
                )}

                {/* Full Import Preview & Confirmation */}
                {fullImportData && (
                  <div className="bg-white p-4 rounded-2xl border-2 border-teal-400 space-y-3.5 shadow-sm animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4.5 h-4.5 text-teal-600" />
                        <span className="font-extrabold text-xs text-gray-900">اطلاعات آماده بازیابی در تمام بخش‌ها:</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        تاریخ تهیه: {toPersianDigits(fullImportData.exportPersianDate || 'معتبر')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                      <div className="bg-teal-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-teal-800 block">اهداف</span>
                        <strong className="text-teal-950 font-black">{toPersianDigits(fullImportData.goals?.length || 0)}</strong>
                      </div>
                      <div className="bg-teal-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-teal-800 block">تسک‌ها</span>
                        <strong className="text-teal-950 font-black">{toPersianDigits(fullImportData.tasks?.length || 0)}</strong>
                      </div>
                      <div className="bg-teal-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-teal-800 block">عادت‌ها</span>
                        <strong className="text-teal-950 font-black">{toPersianDigits(fullImportData.habits?.length || 0)}</strong>
                      </div>
                      <div className="bg-teal-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-teal-800 block">رویداد تقویم</span>
                        <strong className="text-teal-950 font-black">{toPersianDigits(fullImportData.calendarEvents?.length || 0)}</strong>
                      </div>
                      <div className="bg-teal-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-teal-800 block">دسته‌ها</span>
                        <strong className="text-teal-950 font-black">{toPersianDigits(fullImportData.categories?.length || 0)}</strong>
                      </div>
                      <div className="bg-teal-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-teal-800 block">پروفایل و تنظیمات</span>
                        <strong className="text-teal-950 font-black text-[11px]">{fullImportData.userProfile ? 'دارد ✓' : 'پیش‌فرض'}</strong>
                      </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                      <span className="font-bold text-gray-800 block text-[11px]">شیوه اعمال اطلاعات روی دستگاه فعلی:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                          fullImportMode === 'MERGE' ? 'bg-teal-50/80 border-teal-500 text-teal-950 font-bold' : 'bg-white border-gray-200 text-gray-700'
                        }`}>
                          <input
                            type="radio"
                            name="fullImportMode"
                            checked={fullImportMode === 'MERGE'}
                            onChange={() => setFullImportMode('MERGE')}
                            className="mt-0.5 text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <span className="block text-xs">ترکیب و ادغام هوشمند (پیشنهادی)</span>
                            <span className="text-[10px] text-gray-500 font-normal">داده‌های جدید اضافه شده و اطلاعات قبلی گوشی حذف نمی‌شوند.</span>
                          </div>
                        </label>

                        <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                          fullImportMode === 'REPLACE' ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold' : 'bg-white border-gray-200 text-gray-700'
                        }`}>
                          <input
                            type="radio"
                            name="fullImportMode"
                            checked={fullImportMode === 'REPLACE'}
                            onChange={() => setFullImportMode('REPLACE')}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="block text-xs">جایگزینی کامل (دقیق)</span>
                            <span className="text-[10px] text-gray-500 font-normal">تمام داده‌های فعلی پاک شده و دقیقاً با این فایل جایگزین می‌شوند.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setFullImportData(null);
                          setFullImportFile(null);
                        }}
                        className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmFullImport}
                        className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
                      >
                        تایید و اعمال بازیابی در دستگاه
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS ONLY BACKUP */}
          {activeTab === 'TASKS_BACKUP' && (
            <div className="space-y-4">
              <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-teal-950 flex items-center gap-2">
                    <Database className="w-4 h-4 text-teal-700" />
                    <span>پشتیبان‌گیری سریع ویژه تسک‌ها و وظایف</span>
                  </h4>
                  <span className="text-[10px] font-bold bg-teal-200/70 text-teal-900 px-2 py-0.5 rounded-full">
                    مجموع: {toPersianDigits(tasks.length)} تسک
                  </span>
                </div>
                <p className="text-[11px] text-teal-900/80 leading-relaxed">
                  می‌توانید تنها از فهرست وظایف خود خروجی JSON بگیرید یا تسک‌های یک نسخه دیگر را بازگردانی و ادغام نمایید.
                </p>
              </div>

              {/* Tasks Export */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-white space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h5 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-teal-700" />
                      <span>خروجی فایل یا کد JSON تسک‌ها</span>
                    </h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      حاوی تمام {toPersianDigits(tasks.length)} تسک جاری، تکرارشونده و بایگانی شده (بدون عادات یا اهداف)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExportTasksOnly}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود فایل تسک‌ها</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyTasksJsonToClipboard}
                      className="px-3 py-1.5 bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="کپی مستقیم ساختار JSON تسک‌ها"
                    >
                      {isCopiedTaskJson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>کپی شد!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-teal-700" />
                          <span>کپی کد تسک‌ها</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks Import */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h5 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-teal-700" />
                      <span>ورود و بازگردانی مجزای تسک‌ها (مستقل)</span>
                    </h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      فایل یا کد تسک‌ها را انتخاب کنید؛ سایر بخش‌ها (عادت‌ها، اهداف و دسته‌ها) کاملاً دست‌نخورده می‌مانند.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Native Task File Input coupled with label */}
                    <input
                      id="task-backup-file-input"
                      ref={taskFileInputRef}
                      type="file"
                      accept="*/*"
                      onChange={handleTaskFileSelect}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      className="sr-only"
                    />

                    <label
                      htmlFor="task-backup-file-input"
                      className="px-3.5 py-1.5 bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs select-none"
                    >
                      <Upload className="w-3.5 h-3.5 text-teal-700" />
                      <span>انتخاب فایل تسک‌ها</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowTaskPasteBox(!showTaskPasteBox)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-950 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-700" />
                      <span>{showTaskPasteBox ? 'بستن کادر پیست' : 'پیست دستی متن'}</span>
                    </button>
                  </div>
                </div>

                {/* Paste Area for Tasks */}
                {showTaskPasteBox && (
                  <div className="bg-teal-50/40 p-3 rounded-xl border border-teal-200 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-950">کد JSON تسک‌ها را اینجا بچسبانید (Paste):</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (navigator.clipboard && navigator.clipboard.readText) {
                              const text = await navigator.clipboard.readText();
                              if (text && text.trim().length > 0) {
                                setPastedTaskJsonInput(text);
                                parseTasksJsonString(text.trim(), 'حافظه موقت');
                              }
                            }
                          } catch (err) {
                            alert('دسترسی مستقیم مقدور نیست؛ دستی پیست کنید.');
                          }
                        }}
                        className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>چسباندن خودکار از کلیپ‌بورد</span>
                      </button>
                    </div>
                    <textarea
                      value={pastedTaskJsonInput}
                      onChange={(e) => setPastedTaskJsonInput(e.target.value)}
                      placeholder='مثال: [ {"id": "t1", "title": "خرید کتاب", "isCompleted": false} ] یا ساختار خروجی برنامه...'
                      className="w-full h-24 p-2.5 text-xs font-mono bg-white border border-teal-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-gray-800 resize-y"
                      dir="ltr"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTaskPasteBox(false);
                          setPastedTaskJsonInput('');
                        }}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!pastedTaskJsonInput.trim()) {
                            alert('لطفاً متن JSON را در کادر وارد کنید.');
                            return;
                          }
                          parseTasksJsonString(pastedTaskJsonInput.trim(), 'متن دستی');
                        }}
                        className="px-4 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                      >
                        بررسی و بارگذاری تسک‌ها
                      </button>
                    </div>
                  </div>
                )}

                {taskImportError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{taskImportError}</span>
                  </div>
                )}

                {taskImportSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{taskImportSuccess}</span>
                  </div>
                )}

                {taskImportData && (
                  <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50/50 p-3.5 rounded-2xl border border-teal-300 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-teal-950">
                          تعداد تسک‌های آماده بازیابی: {toPersianDigits(taskImportData.length)} تسک
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                          فقط تسک‌ها (عادات و اهداف محفوظند)
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{taskImportFile?.name || 'ورودی متنی'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                        taskImportMode === 'MERGE' ? 'bg-white border-teal-500 text-teal-950 font-bold shadow-2xs' : 'bg-white/60 border-gray-200 text-gray-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={taskImportMode === 'MERGE'}
                          onChange={() => setTaskImportMode('MERGE')}
                          className="mt-0.5 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <span className="block text-xs">ترکیب و ادغام (پیشنهادی)</span>
                          <span className="text-[10px] text-gray-500 font-normal">تسک‌های جدید افزوده شده و تسک‌های قبلی شما حذف نمی‌شوند.</span>
                        </div>
                      </label>
                      <label className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                        taskImportMode === 'REPLACE' ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-2xs' : 'bg-white/60 border-gray-200 text-gray-700'
                      }`}>
                        <input
                          type="radio"
                          name="importMode"
                          checked={taskImportMode === 'REPLACE'}
                          onChange={() => setTaskImportMode('REPLACE')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="block text-xs">جایگزینی کامل لیست تسک‌ها</span>
                          <span className="text-[10px] text-gray-500 font-normal">فقط تسک‌ها جایگزین می‌شوند؛ عادات و اهداف اصلاً پاک نمی‌شوند.</span>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-200">
                      <button
                        type="button"
                        onClick={() => {
                          setTaskImportData(null);
                          setTaskImportFile(null);
                        }}
                        className="px-3.5 py-1.5 text-xs text-gray-600 hover:bg-white rounded-xl cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmTaskImport}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
                      >
                        تایید و اعمال روی تسک‌ها
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: UPDATE SAFETY & GOOGLE PLAY ARCHITECTURE */}
          {activeTab === 'UPDATE_SAFETY' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-emerald-950">
                      معماری امن Google Play: اطلاعات شخصی هر فرد ۱۰۰٪ مجزا و ماندگار است
                    </h4>
                    <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                      هنگامی که این اپلیکیشن روی گوگل‌پلی یا از طریق فایل APK برای کاربران مختلف منتشر شود، داده‌ها در فضای ایزوله دستگاه باقی می‌مانند.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 space-y-1">
                    <span className="font-extrabold text-emerald-900 block flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>ایزولاسیون کامل دیتابیس گوشی:</span>
                    </span>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      داده‌های هر کاربر فقط در حافظه خصوصی و رمزگذاری‌شده برنامه او (App Sandbox) ذخیره می‌شود.
                    </p>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 space-y-1">
                    <span className="font-extrabold text-emerald-900 block flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>عدم حذف اطلاعات هنگام آپگرید:</span>
                    </span>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      با نصب نسخه‌های جدیدتر، دیتابیس بدون هیچ تغییری حفظ شده و فقط قابلیت‌های برنامه به‌روز می‌شوند.
                    </p>
                  </div>
                </div>
              </div>

              {onOpenFullApkDownload && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">نصب برنامه و نسخه اندروید (PWA / APK):</span>
                  <button
                    type="button"
                    onClick={onOpenFullApkDownload}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>نصب روی گوشی</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RELEASE NOTES */}
          {activeTab === 'RELEASE_NOTES' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>گزارش تغییرات و تاریخچه نسخه‌های رسمی APK</span>
                  </h4>
                  <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                    Version {APP_VERSION_INFO.currentVersion} (Build {APP_VERSION_INFO.currentVersionCode})
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  تمامی نسخه‌های فایل نصبی APK همراه با لاگ رسمی تغییرات، تاریخ انتشار شمسی و کد نسخه منتشر می‌شوند.
                </p>
              </div>

              <div className="space-y-3">
                {RELEASE_HISTORY.map((item) => (
                  <div key={item.version} className="border border-gray-200 rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs font-mono">
                          v{item.version}
                        </span>
                        <strong className="text-xs font-bold text-gray-900">{item.title}</strong>
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium">
                        تاریخ انتشار: {toPersianDigits(item.releaseDate)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 block">ویژگی‌های برجسته این نسخه:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-xs text-emerald-950 font-medium pr-1">
                        {item.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-500">
            بسته نصبی: <code className="font-mono text-emerald-800 font-bold">{APP_VERSION_INFO.apkPackageName}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
