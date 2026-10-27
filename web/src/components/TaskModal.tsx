import React, { useState, useEffect, useRef } from 'react';
import { AppTask, Category, Goal, ReminderSettings, AlarmSoundItem } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  toLatinDigits, 
  PERSIAN_MONTHS, 
  addDaysJalali, 
  isSeasonPast, 
  isMonthPast, 
  isYearPast,
  compareJalaliDateStrings,
  isDateHoliday,
  getDayOfWeek
} from '../calendar/jalali';
import { X, Calendar, Clock, Bell, Repeat, Folder, Target, Star, Volume2, Play, Square, ShieldCheck, Check, Copy, AlertTriangle, ArrowRight, Plus, Edit3, CheckSquare } from 'lucide-react';
import { PRESET_ALARM_SOUNDS, previewSound, stopAllAlarmSounds } from '../services/soundService';
import { getNotificationPermission, requestNotificationPermission, isNotificationSupported } from '../services/reminderService';

interface Props {
  isOpen: boolean;
  task?: AppTask | null;
  categories: Category[];
  goals: Goal[];
  reminderSettings?: ReminderSettings;
  isDuplicate?: boolean;
  onClose: () => void;
  onSave: (task: AppTask) => void;
}

export const TaskModal: React.FC<Props> = ({
  isOpen,
  task,
  categories,
  goals,
  reminderSettings,
  isDuplicate = false,
  onClose,
  onSave,
}) => {
  const today = getTodayJalali();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  
  // Inherit category from linked goal if available
  const initialGoal = goals.find(g => g.id === task?.goalId);
  const [categoryId, setCategoryId] = useState(
    task?.categoryId || initialGoal?.categoryId || categories[0]?.id || 'cat-work'
  );
  const [goalId, setGoalId] = useState<string | null>(task?.goalId || null);
  const [isInheritedFromGoal, setIsInheritedFromGoal] = useState(Boolean(initialGoal?.categoryId));

  // Due date state (زمان نهایی که باید تموم بشه)
  const initialHasDueDate = Boolean(task && task.dueDate && task.dueDate.trim() !== '');
  const [hasDueDate, setHasDueDate] = useState(initialHasDueDate);
  const initialDate = (task && task.dueDate) ? task.dueDate : jalaliToFormattedString(today);
  const [dateParts, setDateParts] = useState(() => {
    const p = initialDate.split('/').map(v => parseInt(v, 10));
    return { year: p[0] || today.year, month: p[1] || today.month, day: p[2] || today.day };
  });

  // Start date state (تاریخ شروع یا فعال شدن تسک)
  const initialHasStartDate = Boolean(task && task.startDate && task.startDate.trim() !== '');
  const [hasStartDate, setHasStartDate] = useState(initialHasStartDate);
  const initialStartDateVal = (task && task.startDate) ? task.startDate : jalaliToFormattedString(today);
  const [startDateParts, setStartDateParts] = useState(() => {
    const p = initialStartDateVal.split(/[\/\-]/).map(v => parseInt(v.trim(), 10));
    return { year: p[0] || today.year, month: p[1] || today.month, day: p[2] || today.day };
  });

  // زمان انجام (ساعت شروع یا اجرا)
  const [time, setTime] = useState(task?.time || '10:00');
  const [hasTime, setHasTime] = useState(!!task?.time);

  // ساعت پایان مهلت نهایی (اختیاری)
  const [deadlineTime, setDeadlineTime] = useState(task?.deadlineTime || '18:00');
  const [hasDeadlineTime, setHasDeadlineTime] = useState(!!task?.deadlineTime);

  const [reminderMinutes, setReminderMinutes] = useState<number | null>(task?.reminderMinutesBefore ?? null);
  const [isImportant, setIsImportant] = useState(Boolean(task?.isImportant));
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(task?.reminderEnabled || task?.isImportant));
  const [reminderTime, setReminderTime] = useState(task?.reminderTime || '');
  const [customAlarmSound, setCustomAlarmSound] = useState(task?.customAlarmSound || reminderSettings?.selectedSoundId || 'serenity');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  const [repeatType, setRepeatType] = useState<AppTask['repeatType']>(task?.repeatType || 'NONE');
  const [timerMinutes, setTimerMinutes] = useState(task ? Math.floor(task.timerSecondsTarget / 60) : 25);
  
  // Micro-scheduling: monthOfYear, weekOfMonth, dayOfWeek (now optional/nullable)
  const [monthOfYear, setMonthOfYear] = useState<number | null>(task?.monthOfYear ?? null);
  const [weekOfMonth, setWeekOfMonth] = useState<number | null>(task?.weekOfMonth ?? null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(task?.dayOfWeek ?? null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      stopAllAlarmSounds();
      setPlayingSoundId(null);
      setIsDuplicateMode(false);
      setErrorMessage('');
      return;
    }

    setErrorMessage('');
    const dupl = Boolean(isDuplicate);
    setIsDuplicateMode(dupl);
    setNotifPermission(getNotificationPermission());

    // Reset scroll to top and safely focus title input without scrolling parent viewport
    setTimeout(() => {
      if (bodyContainerRef.current) {
        bodyContainerRef.current.scrollTop = 0;
      }
      titleInputRef.current?.focus({ preventScroll: true });
    }, 50);

    if (task) {
      let initTitle = task.title || '';
      if (dupl && !initTitle.includes('(کپی)')) {
        initTitle = `${initTitle} (کپی)`;
      }
      setTitle(initTitle);
      setNotes(task.notes || '');
      const linkedGoal = goals.find(g => g.id === task.goalId);
      setCategoryId(task.categoryId || linkedGoal?.categoryId || categories[0]?.id || 'cat-work');
      setGoalId(task.goalId || null);
      setIsInheritedFromGoal(Boolean(task.goalId));
      
      const hasValidDate = Boolean(task.dueDate && task.dueDate.trim() !== '');
      setHasDueDate(hasValidDate);
      const rawDate = toLatinDigits(task.dueDate || jalaliToFormattedString(today));
      const p = rawDate.split(/[\/\-]/).map(v => parseInt(v.trim(), 10));
      setDateParts({ year: p[0] || today.year, month: p[1] || today.month, day: p[2] || today.day });

      const hasStart = Boolean(task.startDate && task.startDate.trim() !== '');
      setHasStartDate(hasStart);
      const rawStartDate = toLatinDigits(task.startDate || jalaliToFormattedString(today));
      const sp = rawStartDate.split(/[\/\-]/).map(v => parseInt(v.trim(), 10));
      setStartDateParts({ year: sp[0] || today.year, month: sp[1] || today.month, day: sp[2] || today.day });

      setTime(task.time || '10:00');
      setHasTime(Boolean(task.time));
      setDeadlineTime(task.deadlineTime || '18:00');
      setHasDeadlineTime(Boolean(task.deadlineTime));
      setReminderMinutes(task.reminderMinutesBefore ?? null);
      setIsImportant(Boolean(task.isImportant));
      setReminderEnabled(Boolean(task.reminderEnabled || task.isImportant));
      setReminderTime(task.reminderTime || '');
      setCustomAlarmSound(task.customAlarmSound || reminderSettings?.selectedSoundId || 'serenity');
      setRepeatType(task.repeatType || 'NONE');
      setTimerMinutes(Math.floor((task.timerSecondsTarget || 1500) / 60));
      setMonthOfYear(task.monthOfYear ?? null);
      setWeekOfMonth(task.weekOfMonth ?? null);
      setDayOfWeek(task.dayOfWeek ?? null);
    } else {
      setTitle('');
      setNotes('');
      setCategoryId(categories[0]?.id || 'cat-work');
      setGoalId(null);
      setIsInheritedFromGoal(false);
      // تسک جدید: به طور پیش‌فرض موعد خالی می‌ماند تا پایان سال در نظر گرفته شود و در همه روزها دیده شود
      setHasDueDate(false);
      setDateParts({ year: today.year, month: today.month, day: today.day });
      setHasStartDate(false);
      setStartDateParts({ year: today.year, month: today.month, day: today.day });
      setTime('10:00');
      setHasTime(false);
      setDeadlineTime('18:00');
      setHasDeadlineTime(false);
      setReminderMinutes(null);
      setIsImportant(false);
      setReminderEnabled(false);
      setReminderTime('');
      setCustomAlarmSound(reminderSettings?.selectedSoundId || 'serenity');
      setRepeatType('NONE');
      setTimerMinutes(25);
      setMonthOfYear(null);
      setWeekOfMonth(null);
      setDayOfWeek(null);
    }
  }, [isOpen, task, categories, goals, reminderSettings, isDuplicate]);

  if (!isOpen) return null;

  const handleToggleSoundPreview = (soundId: string) => {
    if (playingSoundId === soundId) {
      stopAllAlarmSounds();
      setPlayingSoundId(null);
    } else {
      stopAllAlarmSounds();
      setPlayingSoundId(soundId);
      previewSound(soundId, reminderSettings?.customSounds || [], reminderSettings?.volume ?? 0.8);
      setTimeout(() => {
        setPlayingSoundId((prev) => (prev === soundId ? null : prev));
      }, 4000);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const allAvailableSounds: AlarmSoundItem[] = [
    ...PRESET_ALARM_SOUNDS,
    ...(reminderSettings?.customSounds || []),
  ];

  const handleGoalChange = (newGoalId: string | null) => {
    setGoalId(newGoalId);
    if (newGoalId) {
      const g = goals.find(item => item.id === newGoalId);
      if (g?.categoryId) {
        setCategoryId(g.categoryId);
        setIsInheritedFromGoal(true);
      }
    } else {
      setIsInheritedFromGoal(false);
    }
  };

  const handleDuplicateCurrentTask = () => {
    setIsDuplicateMode(true);
    if (!title.includes('(کپی)')) {
      setTitle(prev => `${prev} (کپی)`);
    }
  };

  const isActuallyDuplicate = isDuplicateMode || isDuplicate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('لطفاً عنوان تسک را وارد نمایید.');
      return;
    }

    // Validation: prevent creating new tasks in past periods
    const isNew = !task || isActuallyDuplicate;
    if (isNew) {
      if (hasDueDate && dateParts.year && dateParts.month && dateParts.day) {
        const dueStr = `${dateParts.year}/${dateParts.month.toString().padStart(2, '0')}/${dateParts.day.toString().padStart(2, '0')}`;
        const todayStr = jalaliToFormattedString(today);
        if (compareJalaliDateStrings(dueStr, todayStr) < 0) {
          setErrorMessage(`امکان تعریف تسک جدید برای تاریخ گذشته (${toPersianDigits(dueStr)}) وجود ندارد.`);
          return;
        }
      }
      if (monthOfYear !== null && isMonthPast(today.year, monthOfYear, today)) {
        const mName = PERSIAN_MONTHS[monthOfYear - 1] || 'انتخاب‌شده';
        setErrorMessage(`امکان تعریف تسک جدید برای ماه سپری‌شده (${mName}) وجود ندارد.`);
        return;
      }
    }

    setErrorMessage('');

    const dueDateStr = hasDueDate
      ? `${dateParts.year}/${dateParts.month.toString().padStart(2, '0')}/${dateParts.day.toString().padStart(2, '0')}`
      : '';

    const startDateStr = hasStartDate
      ? `${startDateParts.year}/${startDateParts.month.toString().padStart(2, '0')}/${startDateParts.day.toString().padStart(2, '0')}`
      : null;
    
    // Always assign a fresh unique ID if creating or duplicating so original task is NEVER overwritten
    let taskId: string;
    if (isActuallyDuplicate) {
      taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    } else if (task) {
      taskId = task.id;
    } else {
      taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const newTask: AppTask = {
      id: taskId,
      title: title.trim(),
      notes: notes.trim(),
      categoryId,
      goalId: goalId || null,
      startDate: startDateStr,
      dueDate: dueDateStr,
      time: hasTime ? time : null,
      deadlineTime: hasDeadlineTime ? deadlineTime : null,
      reminderMinutesBefore: reminderMinutes,
      isImportant,
      reminderEnabled,
      reminderTime: reminderTime.trim() ? reminderTime.trim() : null,
      reminderDate: dueDateStr || startDateStr || null,
      customAlarmSound,
      lastNotifiedAt: isActuallyDuplicate ? null : (task?.lastNotifiedAt || null),
      repeatType,
      repeatDaysOfWeek: repeatType === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : (dayOfWeek !== null ? [dayOfWeek] : [getDayOfWeek(today)]),
      monthOfYear: monthOfYear ?? null,
      weekOfMonth: weekOfMonth ?? null,
      dayOfWeek: dayOfWeek ?? null,
      timerSecondsTarget: timerMinutes * 60,
      timerSecondsElapsed: isActuallyDuplicate ? 0 : (task?.timerSecondsElapsed || 0),
      isCompleted: isActuallyDuplicate ? false : (task?.isCompleted || false),
      completedAt: isActuallyDuplicate ? null : (task?.completedAt || null),
      isArchived: false,
    };

    onSave(newTask);
    onClose();
  };

  const handleQuickDate = (offsetDays: number) => {
    const target = addDaysJalali(today, offsetDays);
    setDateParts({ year: target.year, month: target.month, day: target.day });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-emerald-100 flex flex-col max-h-[94vh] max-h-[94dvh] overflow-hidden my-auto animate-scale-up relative shrink-0">
        {/* Sticky Header - Always Visible at the top */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isActuallyDuplicate ? 'bg-emerald-100 text-emerald-800' : task ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {isActuallyDuplicate ? <Copy className="w-5 h-5" /> : task ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                {isActuallyDuplicate ? 'ایجاد کپی جدید از تسک' : task ? 'ویرایش تسک' : 'افزودن تسک جدید'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isActuallyDuplicate
                  ? 'یک تسک مستقل با مشخصات کپی شده ایجاد می‌شود'
                  : task
                  ? 'ویرایش اطلاعات، تاریخ و یادآور تسک'
                  : 'تعریف وظیفه جدید، زمانبندی و اتصال به اهداف'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task && !isActuallyDuplicate && (
              <button
                type="button"
                onClick={handleDuplicateCurrentTask}
                title="ایجاد نسخه کپی از این تسک برای ویرایش و ذخیره به عنوان تسک جدید"
                className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">کپی گرفتن</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Container wrapping scrollable body and sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div ref={bodyContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 text-xs sm:text-sm">
            {isActuallyDuplicate && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs px-3 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
                <Copy className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">در حال ایجاد نسخه کپی هستید؛ این تسک به عنوان یک تسک کاملاً جدید ذخیره می‌شود و تسک قبلی بدون تغییر خواهد ماند.</span>
              </div>
            )}

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Prominent Task Title Input Box - Guaranteed visible at the top */}
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-300/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>عنوان وظیفه (تسک) *</span>
                </label>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                  الزامی
                </span>
              </div>
              <input
                ref={titleInputRef}
                type="text"
                required
                autoFocus
                placeholder="مثلاً: مرور اهداف فصلی، ارسال ایمیل یا مطالعه کتاب"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all text-xs sm:text-sm font-semibold text-gray-900 placeholder:text-gray-400 shadow-2xs"
              />
            </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">توضیحات و یادداشت</label>
            <textarea
              rows={2}
              placeholder="جزئیات، لینک‌ها یا نکات مهم..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all text-xs"
            />
          </div>

          {/* Important Task & Reminder Banner */}
          <div className="p-3 bg-gradient-to-r from-amber-50/80 to-amber-100/40 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isImportant ? 'bg-amber-500 text-white' : 'bg-white text-amber-600'} border border-amber-300 shadow-2xs`}>
                <Star className={`w-4 h-4 ${isImportant ? 'fill-white' : ''}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-950 block">علامت‌گذاری به عنوان تسک مهم</span>
                <span className="text-[10px] text-amber-800/80 block">نمایش برجسته و اولویت‌دار در لیست امروز و داشبورد</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIsImportant(val);
                  if (val && !reminderEnabled) {
                    setReminderEnabled(true);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Category & Goal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-emerald-600" />
                  <span>دسته‌بندی</span>
                </span>
                {isInheritedFromGoal && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded-sm">ارث‌بری از هدف</span>
                )}
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setIsInheritedFromGoal(false);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-emerald-500 outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>اتصال به هدف</span>
              </label>
              <select
                value={goalId || ''}
                onChange={(e) => handleGoalChange(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-emerald-500 outline-hidden font-medium"
              >
                <option value="">بدون هدف (مستقل / تسک سریع)</option>
                
                {/* 🎯 اهداف سالانه */}
                {goals.filter(g => g.period === 'ANNUAL').length > 0 && (
                  <optgroup label="🎯 اهداف سالانه (مستقیم)">
                    {goals
                      .filter(g => g.period === 'ANNUAL')
                      .map((g) => {
                        const isPast = isYearPast(g.year || today.year, today);
                        return (
                          <option key={g.id} value={g.id} disabled={isPast}>
                            {isPast ? '⛔ [پایان یافته] ' : ''}🎯 سال {toPersianDigits(g.year)}: {g.title}
                          </option>
                        );
                      })}
                  </optgroup>
                )}

                {/* 🌱 اهداف فصلی تفکیک‌شده با آیکون فصل */}
                {goals.filter(g => g.period === 'SEASONAL').length > 0 && (
                  <optgroup label="🌱 اهداف فصلی (۴ فصل سال)">
                    {goals
                      .filter(g => g.period === 'SEASONAL')
                      .map((g) => {
                        const sIdx = g.seasonIndex ?? 0;
                        const isPast = isSeasonPast(g.year || today.year, sIdx, today);
                        const sIcons = ['🌸', '☀️', '🍂', '❄️'];
                        const sNames = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
                        const icon = sIcons[sIdx] || '🌱';
                        const name = sNames[sIdx] || 'فصل';
                        const parent = g.parentId ? goals.find(p => p.id === g.parentId) : undefined;
                        const parentText = parent ? ` [ذیل ${parent.title}]` : '';
                        return (
                          <option key={g.id} value={g.id} disabled={isPast}>
                            {isPast ? '⛔ [پایان یافته] ' : ''}{icon} فصل {name} {toPersianDigits(g.year)}: {g.title}{parentText}
                          </option>
                        );
                      })}
                  </optgroup>
                )}

                {/* 📅 اهداف ماهانه */}
                {goals.filter(g => g.period === 'MONTHLY').length > 0 && (
                  <optgroup label="📅 اهداف ماهانه">
                    {goals
                      .filter(g => g.period === 'MONTHLY')
                      .map((g) => {
                        const mIdx = g.monthIndex ? g.monthIndex - 1 : 0;
                        const isPast = isMonthPast(g.year || today.year, mIdx + 1, today);
                        const mName = PERSIAN_MONTHS[mIdx] || 'ماه';
                        return (
                          <option key={g.id} value={g.id} disabled={isPast}>
                            {isPast ? '⛔ [پایان یافته] ' : ''}📅 ماه {mName} {toPersianDigits(g.year)}: {g.title}
                          </option>
                        );
                      })}
                  </optgroup>
                )}
              </select>

              {/* Selected Goal Explanatory Tag */}
              {goalId && (() => {
                const selGoal = goals.find(g => g.id === goalId);
                if (!selGoal) return null;
                const isSeasonal = selGoal.period === 'SEASONAL';
                const sIdx = selGoal.seasonIndex ?? 0;
                const sIcons = ['🌸', '☀️', '🍂', '❄️'];
                const sNames = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
                const parent = selGoal.parentId ? goals.find(p => p.id === selGoal.parentId) : undefined;

                return (
                  <div className="mt-1.5 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-950 flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 font-semibold truncate">
                      <span>{isSeasonal ? sIcons[sIdx] : selGoal.period === 'ANNUAL' ? '🎯' : '📅'}</span>
                      <span>
                        {isSeasonal
                          ? `متصل به هدف فصلی: فصل ${sNames[sIdx]}`
                          : selGoal.period === 'ANNUAL'
                          ? 'متصل به هدف کل سال (سالانه)'
                          : 'متصل به هدف ماهانه'}
                      </span>
                      {parent && <span className="text-gray-500 font-normal truncate">({parent.title})</span>}
                    </span>
                    {isSeasonal && (
                      <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded font-bold shrink-0">
                        فصل {sNames[sIdx]}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Month, Week and Day micro-scheduling (ماه، هفته و روز برای تسک‌های خرد - با امکان خالی بودن) */}
          <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>زمان‌بندی خرد (ماه / هفته / روز)</span>
              </span>
              <span className="text-[10px] text-gray-500 font-normal">اختیاری (می‌تواند خالی باشد)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">ماه</label>
                <select
                  value={monthOfYear !== null ? monthOfYear : ''}
                  onChange={(e) => setMonthOfYear(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:border-emerald-500"
                >
                  <option value="">(همه / بدون ماه)</option>
                  {PERSIAN_MONTHS.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">هفته ماه</label>
                <select
                  value={weekOfMonth !== null ? weekOfMonth : ''}
                  onChange={(e) => setWeekOfMonth(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:border-emerald-500"
                >
                  <option value="">(بدون هفته مشخص)</option>
                  <option value={1}>هفته اول</option>
                  <option value={2}>هفته دوم</option>
                  <option value={3}>هفته سوم</option>
                  <option value={4}>هفته چهارم</option>
                  <option value={5}>هفته پنجم</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">روز هفته</label>
                <select
                  value={dayOfWeek !== null ? dayOfWeek : ''}
                  onChange={(e) => setDayOfWeek(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:border-emerald-500"
                >
                  <option value="">(بدون روز مشخص)</option>
                  <option value={0}>شنبه</option>
                  <option value={1}>یکشنبه</option>
                  <option value={2}>دوشنبه</option>
                  <option value={3}>سه‌شنبه</option>
                  <option value={4}>چهارشنبه</option>
                  <option value={5}>پنج‌شنبه</option>
                  <option value={6}>جمعه</option>
                </select>
              </div>
            </div>
          </div>

          {/* زمان انجام (ساعت شروع یا اجرا) */}
          <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>زمان انجام تسک (ساعت شروع یا اجرا)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">{hasTime ? 'دارای ساعت انجام' : 'بدون ساعت مشخص'}</span>
                <input
                  type="checkbox"
                  checked={hasTime}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasTime(checked);
                    if (checked && !reminderTime) {
                      setReminderTime(time);
                    }
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>
            {hasTime && (
              <div className="mt-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    if (!reminderTime || reminderTime === time) {
                      setReminderTime(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-medium"
                />
                <p className="text-[10px] text-gray-500 mt-1">ساعت برنامه‌ریزی‌شده برای آغاز یا اجرای این تسک</p>
              </div>
            )}
          </div>

          {/* تاریخ شروع تسک (اختیاری: فعال شدن از تاریخی به بعد) */}
          <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-xs font-semibold text-sky-950">تاریخ شروع تسک (نمایش از این تاریخ به بعد)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">{hasStartDate ? 'شروع معین' : 'بلافاصله (از امروز)'}</span>
                <input
                  type="checkbox"
                  checked={hasStartDate}
                  onChange={(e) => setHasStartDate(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {hasStartDate ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-sky-800 font-medium">تسک از این تاریخ در کارتابل فعال و دیده می‌شود:</span>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDateParts({ year: today.year, month: today.month, day: today.day });
                      }}
                      className="px-2 py-0.5 bg-white border border-sky-200 text-sky-800 rounded-md hover:bg-sky-100 cursor-pointer"
                    >
                      امروز
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = addDaysJalali(today, 1);
                        setStartDateParts({ year: tomorrow.year, month: tomorrow.month, day: tomorrow.day });
                      }}
                      className="px-2 py-0.5 bg-white border border-sky-200 text-sky-800 rounded-md hover:bg-sky-100 cursor-pointer"
                    >
                      فردا
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasStartDate(false)}
                      className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md hover:bg-rose-100 cursor-pointer"
                    >
                      بدون شروع خاص
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <select
                    value={startDateParts.day}
                    onChange={(e) => setStartDateParts({ ...startDateParts, day: parseInt(e.target.value, 10) })}
                    className="px-2 py-1.5 rounded-lg border border-sky-200 bg-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>روز {toPersianDigits(d)}</option>
                    ))}
                  </select>

                  <select
                    value={startDateParts.month}
                    onChange={(e) => setStartDateParts({ ...startDateParts, month: parseInt(e.target.value, 10) })}
                    className="px-2 py-1.5 rounded-lg border border-sky-200 bg-white"
                  >
                    {PERSIAN_MONTHS.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={startDateParts.year}
                    onChange={(e) => setStartDateParts({ ...startDateParts, year: parseInt(e.target.value, 10) })}
                    className="px-2 py-1.5 rounded-lg border border-sky-200 bg-white"
                  >
                    {[today.year, today.year + 1].map((y) => (
                      <option key={y} value={y}>{toPersianDigits(y)}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                تسک نیاز به انتظار ندارد و از همین امروز در دسته‌بندی و کارتابل فعال است. اگر می‌خواهید این تسک تنها پس از یک تاریخ خاص شروع شود، تیک بالا را فعال کنید.
              </p>
            )}
          </div>

          {/* مهلت نهایی اتمام تسک (زمان نهایی که باید تموم بشه) */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-950">مهلت نهایی اتمام تسک</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">{hasDueDate ? 'مهلت مشخص' : 'پیش‌فرض: پایان سال'}</span>
                <input
                  type="checkbox"
                  checked={hasDueDate}
                  onChange={(e) => setHasDueDate(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {!hasDueDate ? (
              <div className="p-3 bg-white/90 border border-dashed border-emerald-300/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <span>🎯 مهلت پیش‌فرض: پایان سال {toPersianDigits(today.year)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasDueDate(true)}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                  >
                    تعیین تاریخ معین
                  </button>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  چون مهلت خاصی تعیین نشده، مهلت به صورت پیش‌فرض تا <strong>پایان سال {toPersianDigits(today.year)}</strong> منظور می‌شود و این تسک <strong>در همه روزها</strong> در کارتابل امروز دیده خواهد شد.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 font-medium">تاریخ سررسید نهایی:</span>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleQuickDate(0)}
                      className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-md hover:bg-emerald-100 cursor-pointer"
                    >
                      امروز
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDate(1)}
                      className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-md hover:bg-emerald-100 cursor-pointer"
                    >
                      فردا
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateParts({ year: today.year, month: 12, day: 29 });
                      }}
                      className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-md hover:bg-emerald-100 cursor-pointer"
                    >
                      پایان سال
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasDueDate(false)}
                      className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md hover:bg-rose-100 cursor-pointer"
                      title="حذف مهلت مشخص و بازگشت به پیش‌فرض پایان سال"
                    >
                      بدون موعد (پایان سال)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <select
                    value={dateParts.day}
                    onChange={(e) => setDateParts({ ...dateParts, day: parseInt(e.target.value, 10) })}
                    className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>روز {toPersianDigits(d)}</option>
                    ))}
                  </select>

                  <select
                    value={dateParts.month}
                    onChange={(e) => setDateParts({ ...dateParts, month: parseInt(e.target.value, 10) })}
                    className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-white"
                  >
                    {PERSIAN_MONTHS.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={dateParts.year}
                    onChange={(e) => setDateParts({ ...dateParts, year: parseInt(e.target.value, 10) })}
                    className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-white"
                  >
                    {[today.year, today.year + 1].map((y) => (
                      <option key={y} value={y}>{toPersianDigits(y)}</option>
                    ))}
                  </select>
                </div>

                {/* Iranian Holiday Warning if selected date is holiday */}
                {(() => {
                  const check = isDateHoliday({ year: dateParts.year, month: dateParts.month, day: dateParts.day });
                  if (check.isHoliday) {
                    return (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-900 text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <span className="font-bold">توجه: این تاریخ تعطیل رسمی است!</span>
                          <span className="text-[11px] text-rose-700 block mt-0.5">
                            مناسبت: {check.title}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* ساعت پایان مهلت نهایی */}
                <div className="pt-2 border-t border-emerald-200/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-700 font-medium">ساعت پایان مهلت (اختیاری):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500">{hasDeadlineTime ? 'دارد' : 'ندارد'}</span>
                      <input
                        type="checkbox"
                        checked={hasDeadlineTime}
                        onChange={(e) => setHasDeadlineTime(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                  {hasDeadlineTime && (
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-medium"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

            {/* Smart Reminder & Notification Box */}
            <div className="pt-2 border-t border-emerald-200/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md ${reminderEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">یادآور مرورگر و آلارم صوتی</span>
                    <span className="text-[10px] text-gray-500 block">اعلان خودکار با نغمه ملایم در زمان مقرر</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {reminderEnabled && (
                <div className="space-y-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs animate-fade-in text-xs">
                  {/* Timing options */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        ساعت دقیق اعلان (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={reminderTime || (hasTime ? time : '10:00')}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-emerald-50/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        یا یادآوری قبل از موعد
                      </label>
                      <select
                        value={reminderMinutes === null ? '' : reminderMinutes}
                        onChange={(e) => setReminderMinutes(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                      >
                        <option value="">دقیقاً در ساعت تنظیم شده</option>
                        <option value="5">۵ دقیقه قبل</option>
                        <option value="10">۱۰ دقیقه قبل</option>
                        <option value="15">۱۵ دقیقه قبل</option>
                        <option value="30">۳۰ دقیقه قبل</option>
                        <option value="60">۱ ساعت قبل</option>
                      </select>
                    </div>
                  </div>

                  {/* Alarm Sound Picker with Preview */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-emerald-600" />
                        <span>نغمه آلارم (موسیقی ملایم بدون کلام)</span>
                      </span>
                      {reminderSettings?.customSounds && reminderSettings.customSounds.length > 0 && (
                        <span className="text-[10px] text-teal-700">شامل زنگ‌های شخصی شما</span>
                      )}
                    </label>

                    <div className="flex items-center gap-2">
                      <select
                        value={customAlarmSound}
                        onChange={(e) => setCustomAlarmSound(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                      >
                        <optgroup label="نغمه‌های ملایم آرامش‌بخش (پیش‌فرض)">
                          {PRESET_ALARM_SOUNDS.map((s) => (
                            <option key={s.id} value={s.id}>
                              🎵 {s.title} - {s.description}
                            </option>
                          ))}
                        </optgroup>
                        {reminderSettings?.customSounds && reminderSettings.customSounds.length > 0 && (
                          <optgroup label="زنگ‌های سفارشی شما">
                            {reminderSettings.customSounds.map((cs) => (
                              <option key={cs.id} value={cs.id}>
                                ⭐ {cs.title} (سفارشی)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleToggleSoundPreview(customAlarmSound)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                          playingSoundId === customAlarmSound
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                        title="پخش یا قطع پیش‌نمایش صدا"
                      >
                        {playingSoundId === customAlarmSound ? (
                          <>
                            <Square className="w-3 h-3 fill-amber-800" />
                            <span>توقف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-emerald-800" />
                            <span>تست صدا</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Browser Notification Permission Status Check */}
                  <div className="pt-1">
                    {notifPermission === 'granted' ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>مجوز اعلان مرورگر فعال است و یادآور در زمان مقرر اعلام خواهد شد.</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>برای دریافت اعلان مرورگر، دسترسی اعلان را تایید نمایید.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRequestPermission}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md transition-colors cursor-pointer text-[10px] shrink-0"
                        >
                          فعال‌سازی مجوز اعلان
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          {/* Repeat & Focus timer target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-emerald-600" />
                <span>تکرار</span>
              </label>
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as AppTask['repeatType'])}
                className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white"
              >
                <option value="NONE">بدون تکرار</option>
                <option value="DAILY">هر روز</option>
                <option value="WEEKLY">هفتگی</option>
                <option value="MONTHLY">ماهانه</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>هدف تمرکز (دقیقه)</span>
              </label>
              <input
                type="number"
                min="0"
                max="240"
                step="5"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Sticky Footer - Always Visible at the bottom */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-gray-100 bg-gray-50/95 flex items-center gap-2.5 shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-xs sm:text-sm cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold transition-all shadow-sm text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{task && !isActuallyDuplicate ? 'ذخیره تغییرات' : 'افزودن وظیفه'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
