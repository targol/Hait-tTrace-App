import { PRIORITIES, priorityOf, TaskPriority } from '../utils/priority';
import React, { useState, useEffect, useRef } from 'react';
import { AppTask, Category, Goal, Habit, ReminderSettings, AlarmSoundItem } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  toLatinDigits, 
  PERSIAN_MONTHS, 
  addDaysJalali, getDaysInJalaliMonth, 
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
  habit?: Habit | null;
  onSaveHabit?: (habit: Habit) => void;
  todayStr?: string;
  categories: Category[];
  goals: Goal[];
  allTasks?: AppTask[];
  reminderSettings?: ReminderSettings;
  isDuplicate?: boolean;
  onClose: () => void;
  onSave: (task: AppTask) => void;
}

export const TaskModal: React.FC<Props> = ({
  isOpen,
  task: taskProp,
  habit,
  onSaveHabit,
  categories,
  goals,
  allTasks = [],
  reminderSettings,
  isDuplicate = false,
  onClose,
  onSave,
}) => {
  const today = getTodayJalali();
  const task: AppTask | null | undefined = React.useMemo(() => habit ? ({
    id: habit.id, title: habit.title, notes: habit.notes || '', categoryId: habit.categoryId, goalId: habit.goalId || null,
    dueDate: '', time: habit.time || null, repeatType: habit.frequency === 'DAILY' ? 'DAILY' : 'WEEKLY',
    repeatDaysOfWeek: habit.targetDaysOfWeek || [], timerSecondsTarget: (habit.timerMinutes || 0) * 60, timerSecondsElapsed: 0, isCompleted: false,
  } as AppTask) : taskProp, [habit, taskProp]);
  const isExistingTask = !!taskProp && allTasks.some(t => t.id === taskProp.id);
  const [showMore, setShowMore] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weekDays, setWeekDays] = useState<number[]>(task?.repeatType === 'WEEKLY' && task.repeatDaysOfWeek?.length ? task.repeatDaysOfWeek : [getDayOfWeek(today)]);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const candidatePrereqs = React.useMemo(() => {
    const selfId = task?.id;
    const blocked = new Set<string>();
    if (selfId) {
      blocked.add(selfId);
      let changed = true;
      while (changed) {
        changed = false;
        for (const t of allTasks) {
          if (!blocked.has(t.id) && (t.dependsOn || []).some(d => blocked.has(d))) {
            blocked.add(t.id);
            changed = true;
          }
        }
      }
    }
    return allTasks.filter(t => !blocked.has(t.id) && !t.isArchived);
  }, [allTasks, task?.id]);

  const [dependsOn, setDependsOn] = useState<string[]>(task?.dependsOn || []);
  const [linkedWith, setLinkedWith] = useState<string[]>(task?.linkedWith || []);
  const [priority, setPriority] = useState<TaskPriority | undefined>(task ? priorityOf(task) : undefined);
  const [subtasks, setSubtasks] = useState<NonNullable<AppTask['subtasks']>>(task?.subtasks || []);
  const [subInput, setSubInput] = useState('');
  
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

  // Start date state (تاریخ شروع یا فعال شدن وظیفه)
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
  const isRepeating = repeatType === 'DAILY' || repeatType === 'WEEKLY';
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
      setDependsOn(task.dependsOn || []);
      setLinkedWith(task.linkedWith || []);
      setPriority(priorityOf(task));
      setSubtasks(task.subtasks || []);
      setIsImportant(Boolean(task.isImportant));
      setReminderEnabled(Boolean(task.reminderEnabled || task.isImportant));
      setReminderTime(task.reminderTime || '');
      setCustomAlarmSound(task.customAlarmSound || reminderSettings?.selectedSoundId || 'serenity');
      setRepeatType(task.repeatType || 'NONE');
      setWeekDays(task.repeatType === 'WEEKLY' && task.repeatDaysOfWeek?.length ? task.repeatDaysOfWeek : [getDayOfWeek(today)]);
      setShowMore(false);
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
      // وظیفه جدید: به طور پیش‌فرض موعد خالی می‌ماند تا پایان سال در نظر گرفته شود و در همه روزها دیده شود
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
      setWeekDays([getDayOfWeek(today)]);
      setShowMore(false);
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
      setErrorMessage('لطفاً عنوان وظیفه را وارد نمایید.');
      return;
    }

    // Validation: prevent creating new tasks in past periods
    const isNew = !task || isActuallyDuplicate;
    if (isNew) {
      if (hasDueDate && dateParts.year && dateParts.month && dateParts.day) {
        const dueStr = `${dateParts.year}/${dateParts.month.toString().padStart(2, '0')}/${dateParts.day.toString().padStart(2, '0')}`;
        const todayStr = jalaliToFormattedString(today);
        if (compareJalaliDateStrings(dueStr, todayStr) < 0) {
          setErrorMessage(`امکان تعریف وظیفه جدید برای تاریخ گذشته (${toPersianDigits(dueStr)}) وجود ندارد.`);
          return;
        }
      }
      if (monthOfYear !== null && isMonthPast(today.year, monthOfYear, today)) {
        const mName = PERSIAN_MONTHS[monthOfYear - 1] || 'انتخاب‌شده';
        setErrorMessage(`امکان تعریف وظیفه جدید برای ماه سپری‌شده (${mName}) وجود ندارد.`);
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

    if (isRepeating && onSaveHabit && (habit || !isExistingTask || isActuallyDuplicate)) {
      const days = repeatType === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : (weekDays.length ? weekDays : [getDayOfWeek(today)]);
      const base = habit || null;
      onSaveHabit({
        id: base ? base.id : `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        notes: notes.trim(),
        categoryId,
        goalId: goalId || null,
        time: hasTime ? time : null,
        timerMinutes,
        frequency: repeatType === 'DAILY' ? 'DAILY' : 'WEEKLY',
        targetDaysOfWeek: days,
        targetCountPerWeek: base?.targetCountPerWeek,
        exemptHolidays: base?.exemptHolidays ?? false,
        exemptWeekends: base?.exemptWeekends ?? false,
        plantType: base?.plantType || 'بونسای',
        completionHistory: base?.completionHistory || {},
        dailyProgressHistory: base?.dailyProgressHistory,
        dailyElapsedSeconds: base?.dailyElapsedSeconds,
        focusSessions: base?.focusSessions,
        createdAt: base?.createdAt || jalaliToFormattedString(today),
        isClosed: base?.isClosed,
        closedAt: base?.closedAt,
      });
      onClose();
      return;
    }

    const newTask: AppTask = {
      id: taskId,
      title: title.trim(),
      notes: notes.trim(),
      categoryId,
      goalId: goalId || null,
      dependsOn: dependsOn.length ? dependsOn : undefined,
      linkedWith: linkedWith.length ? linkedWith : undefined,
      subtasks: (() => { const s2 = subInput.trim(); const all = s2 ? [...subtasks, { id: 'st_' + Date.now().toString(36), title: s2, done: false }] : subtasks; return all.length ? all : undefined; })(),
      priority,
      startDate: startDateStr,
      dueDate: dueDateStr,
      time: hasTime ? time : null,
      deadlineTime: hasDeadlineTime ? deadlineTime : null,
      reminderMinutesBefore: reminderMinutes,
      isImportant: priority === 'HIGH',
      reminderEnabled,
      reminderTime: reminderTime.trim() ? reminderTime.trim() : null,
      reminderDate: dueDateStr || startDateStr || null,
      customAlarmSound,
      lastNotifiedAt: isActuallyDuplicate ? null : (task?.lastNotifiedAt || null),
      repeatType,
      repeatDaysOfWeek: repeatType === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : repeatType === 'WEEKLY' ? (weekDays.length ? weekDays : [getDayOfWeek(today)]) : (dayOfWeek !== null ? [dayOfWeek] : [getDayOfWeek(today)]),
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
                {isActuallyDuplicate ? 'ایجاد کپی جدید از وظیفه' : (isExistingTask || !!habit?.title) ? 'ویرایش وظیفه' : 'افزودن وظیفه جدید'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isActuallyDuplicate
                  ? 'یک وظیفه مستقل با مشخصات کپی شده ایجاد می‌شود'
                  : (isExistingTask || !!habit?.title)
                  ? 'ویرایش اطلاعات، تاریخ و یادآور وظیفه'
                  : 'تعریف وظیفه جدید، زمانبندی و اتصال به اهداف'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task && !isActuallyDuplicate && (
              <button
                type="button"
                onClick={handleDuplicateCurrentTask}
                title="ایجاد نسخه کپی از این وظیفه برای ویرایش و ذخیره به عنوان وظیفه جدید"
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
                <span className="font-semibold">در حال ایجاد نسخه کپی هستید؛ این وظیفه به عنوان یک وظیفه کاملاً جدید ذخیره می‌شود و وظیفه قبلی بدون تغییر خواهد ماند.</span>
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
                  <span>عنوان وظیفه *</span>
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

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">اولویت</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map(pr => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => {
                    const next = priority === pr.id ? undefined : pr.id;
                    setPriority(next);
                    setIsImportant(next === 'HIGH');
                    if (next === 'HIGH' && !reminderEnabled) setReminderEnabled(true);
                  }}
                  className="py-2 rounded-xl text-xs font-black border-2 cursor-pointer transition-colors"
                  style={priority === pr.id ? { background: pr.color, color: '#fff', borderColor: pr.color } : { background: '#fff', color: pr.color, borderColor: pr.color + '66' }}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat (a repeating task is a habit) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5 text-emerald-600" />
              <span>تکرار</span>
            </label>
            <div className="flex gap-1.5">
              {([['NONE', 'یک‌بار'], ['DAILY', 'هر روز'], ['WEEKLY', 'روزهای هفته']] as const)
                .filter(([v]) => !(habit && v === 'NONE'))
                .map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRepeatType(v)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer ${repeatType === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >{label}</button>
              ))}
              {repeatType === 'MONTHLY' && <span className="flex-1 py-2 rounded-xl border text-xs font-bold text-center bg-emerald-600 text-white border-emerald-600">ماهانه</span>}
            </div>
            {repeatType === 'WEEKLY' && (
              <div className="flex gap-1 mt-2">
                {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((n, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setWeekDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort())}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${weekDays.includes(i) ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-white text-gray-500 border-gray-200'}`}
                  >{n}</button>
                ))}
              </div>
            )}
            {isRepeating && !habit && !isExistingTask && (
              <p className="text-[10px] text-gray-500 mt-1.5">وظیفهٔ تکرارشونده در بخش «تکرارشونده» لیست وظیفه‌ها و در جدول عادت‌های دفتر ثبت می‌شود.</p>
            )}
          </div>

          {!isRepeating && (
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100/80 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-950">مهلت اتمام</span>
              {hasDueDate && (
                <span className="text-[11px] text-emerald-800 mr-auto">
                  {toPersianDigits(`${dateParts.year}/${String(dateParts.month).padStart(2, '0')}/${String(dateParts.day).padStart(2, '0')}`)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ['امروز', () => addDaysJalali(today, 0)],
                ['فردا', () => addDaysJalali(today, 1)],
                ['پایان هفته', () => addDaysJalali(today, (6 - getDayOfWeek(today) + 7) % 7)],
                ['پایان ماه', () => ({ year: today.year, month: today.month, day: getDaysInJalaliMonth(today.year, today.month) })],
                ['پایان فصل', () => { const m = Math.ceil(today.month / 3) * 3; return { year: today.year, month: m, day: getDaysInJalaliMonth(today.year, m) }; }],
                ['پایان سال', () => ({ year: today.year, month: 12, day: getDaysInJalaliMonth(today.year, 12) })],
              ] as [string, () => { year: number; month: number; day: number }][]).map(([label, calc]) => {
                const t = calc();
                const active = hasDueDate && !showDatePicker && dateParts.year === t.year && dateParts.month === t.month && dateParts.day === t.day;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setDateParts({ year: t.year, month: t.month, day: t.day }); setHasDueDate(true); setShowDatePicker(false); }}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200'}`}
                  >{label}</button>
                );
              })}
              <button
                type="button"
                onClick={() => { setHasDueDate(true); setShowDatePicker(v => !v); }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${showDatePicker ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200'}`}
              >انتخاب تاریخ</button>
              <button
                type="button"
                onClick={() => { setHasDueDate(false); setShowDatePicker(false); }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${!hasDueDate ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'}`}
              >بدون مهلت</button>
            </div>

            {hasDueDate && showDatePicker && (
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
            )}

            {!hasDueDate && (
              <p className="text-[11px] text-gray-500">بدون مهلت، وظیفه تا پایان سال {toPersianDigits(today.year)} باز می‌ماند.</p>
            )}

            {hasDueDate && (() => {
              const check = isDateHoliday({ year: dateParts.year, month: dateParts.month, day: dateParts.day });
              return check.isHoliday ? (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-900 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>این تاریخ تعطیل است: {check.title}</span>
                </div>
              ) : null;
            })()}

            {hasDueDate && (
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDeadlineTime}
                    onChange={(e) => setHasDeadlineTime(e.target.checked)}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <span>ساعت پایان</span>
                </label>
                {hasDeadlineTime && (
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-emerald-200 bg-white text-xs"
                  />
                )}
              </div>
            )}
          </div>
          )}

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
                <option value="">بدون هدف (مستقل / وظیفه سریع)</option>
                
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

          <button
            type="button"
            onClick={() => setShowMore(v => !v)}
            className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-600 cursor-pointer"
          >{showMore ? 'بستن گزینه‌های بیشتر ▴' : 'گزینه‌های بیشتر (ساعت، شروع، یادآور، پیش‌نیاز، قدم‌ها) ▾'}</button>

          {showMore && (
          <div className="space-y-4">
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

          {/* زمان انجام (ساعت شروع یا اجرا) */}
          <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>زمان انجام وظیفه (ساعت شروع یا اجرا)</span>
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
                <p className="text-[10px] text-gray-500 mt-1">ساعت برنامه‌ریزی‌شده برای آغاز یا اجرای این وظیفه</p>
              </div>
            )}
          </div>

          {/* تاریخ شروع وظیفه (اختیاری: فعال شدن از تاریخی به بعد) */}
          <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-xs font-semibold text-sky-950">تاریخ شروع وظیفه (نمایش از این تاریخ به بعد)</span>
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
                  <span className="text-[11px] text-sky-800 font-medium">وظیفه از این تاریخ در کارتابل فعال و دیده می‌شود:</span>
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
                وظیفه نیاز به انتظار ندارد و از همین امروز در دسته‌بندی و کارتابل فعال است. اگر می‌خواهید این وظیفه تنها پس از یک تاریخ خاص شروع شود، تیک بالا را فعال کنید.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <span>وظیفه‌های فرعی (قدم‌ها)</span>
              </label>
              <div className="space-y-1 mb-1.5">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
                    <input type="checkbox" checked={s.done} onChange={e => setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, done: e.target.checked } : x))} />
                    <span className={`flex-1 text-xs ${s.done ? 'line-through text-gray-400' : ''}`}>{s.title}</span>
                    <button type="button" onClick={() => setSubtasks(prev => prev.filter(x => x.id !== s.id))} className="text-rose-500 text-xs cursor-pointer px-1">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={subInput}
                  onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = subInput.trim(); if (v) { setSubtasks(prev => [...prev, { id: 'st_' + Date.now().toString(36) + prev.length, title: v, done: false }]); setSubInput(''); } } }}
                  placeholder="یک قدم بنویسید و Enter بزنید"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs"
                />
                <button type="button" onClick={() => { const v = subInput.trim(); if (v) { setSubtasks(prev => [...prev, { id: 'st_' + Date.now().toString(36) + prev.length, title: v, done: false }]); setSubInput(''); } }} className="px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">افزودن</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <span>پیش‌نیاز (اختیاری)</span>
              </label>
              {candidatePrereqs.length === 0 ? (
                <p className="text-[11px] text-gray-400">وظیفه دیگری برای انتخاب وجود ندارد.</p>
              ) : (
                <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
                  {candidatePrereqs.map(t => (
                    <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-emerald-50/50">
                      <input
                        type="checkbox"
                        checked={dependsOn.includes(t.id)}
                        onChange={(e) =>
                          setDependsOn(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))
                        }
                      />
                      <span className={t.isCompleted ? 'line-through text-gray-400' : ''}>{t.title}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">این وظیفه بعد از انجام وظیفه‌های انتخاب‌شده قابل انجام است.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <span>همراه با (انجام هم‌زمان)</span>
              </label>
              {candidatePrereqs.length === 0 ? (
                <p className="text-[11px] text-gray-400">وظیفه دیگری برای انتخاب وجود ندارد.</p>
              ) : (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
                  {allTasks.filter(t => t.id !== task?.id && !t.isArchived).map(t => (
                    <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-emerald-50/50">
                      <input
                        type="checkbox"
                        checked={linkedWith.includes(t.id)}
                        onChange={(e) =>
                          setLinkedWith(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))
                        }
                      />
                      <span className={t.isCompleted ? 'line-through text-gray-400' : ''}>{t.title}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">هنگام انجام یکی، می‌توانید دیگری را هم انجام‌شده کنید.</p>
            </div>
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

                </div>
              )}
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
          )}

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
            <span>{(isExistingTask || !!habit?.title) && !isActuallyDuplicate ? 'ذخیره تغییرات' : 'افزودن وظیفه'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
