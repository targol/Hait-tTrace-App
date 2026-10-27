import React, { useState, useMemo } from 'react';
import { Goal, AppTask, Habit, Category } from '../types';
import { 
  toPersianDigits, 
  PERSIAN_MONTHS, 
  getTodayJalali, 
  jalaliToFormattedString, 
  getCurrentPersianDateTimeString 
} from '../calendar/jalali';
import { 
  X, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Target, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  CheckSquare, 
  Flame, 
  Folder, 
  Clock, 
  Plus, 
  Trash2,
  Lock
} from 'lucide-react';
import { PlantIcon } from './PlantIcon';
import { EntityIcon, EntityBadge } from './EntityIcon';

interface Props {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onSaveComplete: (
    annualGoal: Goal, 
    intermediateGoals: Goal[], 
    microTask?: AppTask, 
    microHabit?: Habit
  ) => void;
}

const SEASONS_CONFIG = [
  { index: 0, name: 'بهار', months: 'فروردین، اردیبهشت، خرداد', icon: '🌸', color: 'border-emerald-300 bg-emerald-50/60 text-emerald-800' },
  { index: 1, name: 'تابستان', months: 'تیر، مرداد، شهریور', icon: '☀️', color: 'border-amber-300 bg-amber-50/60 text-amber-800' },
  { index: 2, name: 'پاییز', months: 'مهر، آبان، آذر', icon: '🍂', color: 'border-orange-300 bg-orange-50/60 text-orange-800' },
  { index: 3, name: 'زمستان', months: 'دی، بهمن، اسفند', icon: '❄️', color: 'border-blue-300 bg-blue-50/60 text-blue-800' },
];

const PLANT_OPTIONS = [
  'بونسای',
  'کاکتوس',
  'پوتوس',
  'بامبو',
  'سانسوریا',
  'نخل مرداب',
  'درخت زیتون',
  'گل ارکیده',
  'آلوئه‌ورا',
  'برگ انجیری'
];

interface SeasonalGoalDraft {
  enabled: boolean;
  title: string;
  description: string;
}

interface MonthlyGoalDraft {
  id: string;
  monthIndex: number;
  title: string;
  description: string;
}

export const AnnualGoalWizardModal: React.FC<Props> = ({
  isOpen,
  categories,
  onClose,
  onSaveComplete,
}) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);
  const currentSeasonIdx = Math.floor((today.month - 1) / 3);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Annual Goal
  const [annualTitle, setAnnualTitle] = useState('');
  const [annualDescription, setAnnualDescription] = useState('');
  const [annualVisionWhy, setAnnualVisionWhy] = useState('');
  const [annualYear, setAnnualYear] = useState<number>(today.year);
  const [annualYearError, setAnnualYearError] = useState<string | null>(null);
  const allowedGoalYears = [today.year, today.year + 1];
  const [annualCategoryId, setAnnualCategoryId] = useState<string>(categories[0]?.id || 'cat-work');
  const [annualPlantType, setAnnualPlantType] = useState<string>('بونسای');
  const [startTimingType, setStartTimingType] = useState<'TODAY' | 'YEAR_START' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState(todayStr);

  // Step 2: Intermediate Goals (All 4 Seasons + Monthly goals)
  // Category is NOT selectable; it strictly inherits annualCategoryId
  const [intermediateTab, setIntermediateTab] = useState<'SEASONS' | 'MONTHS'>('SEASONS');
  const [seasonalDrafts, setSeasonalDrafts] = useState<Record<number, SeasonalGoalDraft>>({
    0: { enabled: false, title: '', description: '' },
    1: { enabled: false, title: '', description: '' },
    2: { enabled: false, title: '', description: '' },
    3: { enabled: false, title: '', description: '' },
  });
  const [monthlyDrafts, setMonthlyDrafts] = useState<MonthlyGoalDraft[]>([]);
  const [newMonthToAdd, setNewMonthToAdd] = useState<number>(today.month);

  // Step 3: Initial Micro-Task & Micro-Habit
  const [hasMicroTask, setHasMicroTask] = useState(true);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskDayOfWeek, setTaskDayOfWeek] = useState<number>(0); // شنبه
  const [taskTimerMinutes, setTaskTimerMinutes] = useState<number>(25);

  const [hasMicroHabit, setHasMicroHabit] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitTimerMinutes, setHabitTimerMinutes] = useState<number>(15);

  const [targetGoalChoice, setTargetGoalChoice] = useState<'ANNUAL' | string>('ANNUAL');

  // Find category info
  const annualCategory = useMemo(() => {
    return categories.find(c => c.id === annualCategoryId) || categories[0];
  }, [categories, annualCategoryId]);

  // Toggle seasonal draft
  const toggleSeason = (sIdx: number) => {
    setSeasonalDrafts(prev => ({
      ...prev,
      [sIdx]: {
        ...prev[sIdx],
        enabled: !prev[sIdx].enabled,
        title: !prev[sIdx].enabled && !prev[sIdx].title.trim() && annualTitle.trim()
          ? `گام فصل ${SEASONS_CONFIG[sIdx].name}: ${annualTitle.trim()}`
          : prev[sIdx].title,
      }
    }));
  };

  const updateSeasonTitle = (sIdx: number, val: string) => {
    setSeasonalDrafts(prev => ({
      ...prev,
      [sIdx]: {
        ...prev[sIdx],
        enabled: true,
        title: val,
      }
    }));
  };

  const updateSeasonDesc = (sIdx: number, val: string) => {
    setSeasonalDrafts(prev => ({
      ...prev,
      [sIdx]: {
        ...prev[sIdx],
        description: val,
      }
    }));
  };

  // Monthly goals management
  const addMonthlyDraft = () => {
    const defaultTitle = annualTitle.trim() ? `گام ماه ${PERSIAN_MONTHS[newMonthToAdd - 1]}: ${annualTitle.trim()}` : '';
    const newDraft: MonthlyGoalDraft = {
      id: `monthly-draft-${Date.now()}`,
      monthIndex: newMonthToAdd,
      title: defaultTitle,
      description: '',
    };
    setMonthlyDrafts(prev => [...prev, newDraft]);
    // increment month for next quick add
    setNewMonthToAdd(prev => prev === 12 ? 1 : prev + 1);
  };

  const removeMonthlyDraft = (id: string) => {
    setMonthlyDrafts(prev => prev.filter(m => m.id !== id));
  };

  const updateMonthlyDraft = (id: string, field: 'title' | 'description' | 'monthIndex', value: any) => {
    setMonthlyDrafts(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Compile available intermediate options for Step 3 target selection
  const availableCreatedIntermediateGoals = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    SEASONS_CONFIG.forEach(s => {
      if (seasonalDrafts[s.index]?.enabled && seasonalDrafts[s.index]?.title.trim()) {
        list.push({
          id: `SEASON_${s.index}`,
          label: `فصل ${s.name}: ${seasonalDrafts[s.index].title.trim()}`,
        });
      }
    });
    monthlyDrafts.forEach(m => {
      if (m.title.trim()) {
        list.push({
          id: `MONTH_${m.id}`,
          label: `ماه ${PERSIAN_MONTHS[m.monthIndex - 1]}: ${m.title.trim()}`,
        });
      }
    });
    return list;
  }, [seasonalDrafts, monthlyDrafts]);

  const handleFinish = () => {
    if (!annualTitle.trim()) {
      setStep(1);
      return;
    }

    if (annualYear < today.year || annualYear > today.year + 1) {
      setAnnualYearError(`تعریف هدف تنها برای سال جاری (${toPersianDigits(today.year)}) یا حداکثر یک سال بعد (${toPersianDigits(today.year + 1)}) امکان‌پذیر است.`);
      setStep(1);
      return;
    }

    const effectiveYear = annualYear;

    const effectiveStartDate =
      startTimingType === 'TODAY'
        ? todayStr
        : startTimingType === 'YEAR_START'
        ? `${effectiveYear}/01/01`
        : customStartDate;

    const annualGoalId = `goal-annual-${Date.now()}`;
    const timestampNow = getCurrentPersianDateTimeString();

    // 1. Annual Goal
    const annualGoal: Goal = {
      id: annualGoalId,
      title: annualTitle.trim(),
      description: annualDescription.trim(),
      visionWhy: annualVisionWhy.trim(),
      year: effectiveYear,
      period: 'ANNUAL',
      status: 'IN_PROGRESS',
      startDate: effectiveStartDate,
      categoryId: annualCategoryId,
      plantType: annualPlantType,
      createdAt: todayStr,
      history: [
        {
          id: `hist-${Date.now()}-1`,
          timestamp: timestampNow,
          action: 'CREATED',
          description: `طراحی و تعریف هدف سالانه برای سال ${toPersianDigits(effectiveYear)}`,
        },
      ],
    };

    // 2. Intermediate Goals (Seasonal + Monthly)
    // NOTE: All intermediate goals strictly inherit categoryId from annualCategoryId
    const intermediateGoals: Goal[] = [];
    const goalIdMap: Record<string, string> = {};

    SEASONS_CONFIG.forEach(s => {
      const draft = seasonalDrafts[s.index];
      if (draft.enabled && draft.title.trim()) {
        const seasonGoalId = `goal-season-${s.index}-${Date.now()}`;
        goalIdMap[`SEASON_${s.index}`] = seasonGoalId;
        intermediateGoals.push({
          id: seasonGoalId,
          title: draft.title.trim(),
          description: draft.description.trim(),
          year: effectiveYear,
          period: 'SEASONAL',
          seasonIndex: s.index,
          parentId: annualGoalId,
          categoryId: annualCategoryId, // INHERITED STRICTLY
          plantType: annualPlantType,
          status: 'IN_PROGRESS',
          startDate: effectiveStartDate,
          createdAt: todayStr,
          history: [
            {
              id: `hist-${Date.now()}-s${s.index}`,
              timestamp: timestampNow,
              action: 'CREATED',
              description: `تعریف هدف میانی فصل ${s.name} ذیل هدف سالانه`,
            },
          ],
        });
      }
    });

    monthlyDrafts.forEach((m, idx) => {
      if (m.title.trim()) {
        const monthGoalId = `goal-month-${m.monthIndex}-${Date.now()}-${idx}`;
        goalIdMap[`MONTH_${m.id}`] = monthGoalId;
        intermediateGoals.push({
          id: monthGoalId,
          title: m.title.trim(),
          description: m.description.trim(),
          year: effectiveYear,
          period: 'MONTHLY',
          monthIndex: m.monthIndex,
          parentId: annualGoalId,
          categoryId: annualCategoryId, // INHERITED STRICTLY
          plantType: annualPlantType,
          status: 'IN_PROGRESS',
          startDate: effectiveStartDate,
          createdAt: todayStr,
          history: [
            {
              id: `hist-${Date.now()}-m${m.monthIndex}`,
              timestamp: timestampNow,
              action: 'CREATED',
              description: `تعریف هدف میانی ماه ${PERSIAN_MONTHS[m.monthIndex - 1]} ذیل هدف سالانه`,
            },
          ],
        });
      }
    });

    // Determine target goal for initial task / habit
    let selectedGoalIdForItems = annualGoalId;
    if (targetGoalChoice !== 'ANNUAL' && goalIdMap[targetGoalChoice]) {
      selectedGoalIdForItems = goalIdMap[targetGoalChoice];
    } else if (intermediateGoals.length > 0 && targetGoalChoice === 'FIRST_INTERMEDIATE') {
      selectedGoalIdForItems = intermediateGoals[0].id;
    }

    // 3. Initial Micro Task
    let microTask: AppTask | undefined;
    if (hasMicroTask && taskTitle.trim()) {
      microTask = {
        id: `task-micro-${Date.now()}`,
        title: taskTitle.trim(),
        notes: taskNotes.trim(),
        categoryId: annualCategoryId,
        goalId: selectedGoalIdForItems,
        dueDate: todayStr,
        time: '10:00',
        reminderMinutesBefore: 15,
        repeatType: 'NONE',
        repeatDaysOfWeek: [taskDayOfWeek],
        weekOfMonth: 1,
        dayOfWeek: taskDayOfWeek,
        timerSecondsTarget: taskTimerMinutes * 60,
        timerSecondsElapsed: 0,
        isCompleted: false,
      };
    }

    // 4. Initial Micro Habit
    let microHabit: Habit | undefined;
    if (hasMicroHabit && habitTitle.trim()) {
      microHabit = {
        id: `habit-micro-${Date.now()}`,
        title: habitTitle.trim(),
        categoryId: annualCategoryId,
        plantType: annualPlantType,
        frequency: 'DAILY',
        targetDaysPerWeek: 7,
        selectedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        currentStreak: 0,
        longestStreak: 0,
        completionHistory: {},
        goalId: selectedGoalIdForItems,
        timerMinutes: habitTimerMinutes,
      };
    }

    onSaveComplete(annualGoal, intermediateGoals, microTask, microHabit);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up relative">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                طراحی یکپارچه هدف سالانه و اهداف میانی
              </h3>
              <p className="text-[11px] text-gray-500">
                تعریف هدف سالانه، گام‌های فصلی و ماهانه، و اقدامات اجرایی روزمره
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between text-xs shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
              step === 1 ? 'text-emerald-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <EntityIcon type="ANNUAL_GOAL" size="xs" showBackground={step === 1} />
            <span>۱. هدف سالانه</span>
          </button>

          <span className="text-gray-300">←</span>

          <button
            type="button"
            onClick={() => { if (annualTitle.trim()) setStep(2); }}
            className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
              step === 2 ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <EntityIcon type="INTERMEDIATE_GOAL" size="xs" showBackground={step === 2} />
            <span>۲. اهداف میانی (فصل‌ها و ماه‌ها)</span>
          </button>

          <span className="text-gray-300">←</span>

          <button
            type="button"
            onClick={() => { if (annualTitle.trim()) setStep(3); }}
            className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
              step === 3 ? 'text-sky-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <EntityIcon type="TASK" size="xs" showBackground={step === 3} />
            <span>۳. اقدامات اولیه</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4 max-h-[calc(92vh-140px)]">
          {/* ================= STEP 1: ANNUAL GOAL ================= */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-300/80 shadow-2xs space-y-2">
                <label className="font-bold text-gray-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span>عنوان هدف سالانه *</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    الزامی
                  </span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="مثلاً: رسیدن به وزن ایده‌آل و تناسب اندام، یادگیری مکالمه آلمانی، یا رشد کسب‌وکار"
                  value={annualTitle}
                  onChange={(e) => setAnnualTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white outline-hidden text-xs font-semibold"
                />
              </div>

              {/* Vision & Why */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">
                  چرا این هدف برای شما حیاتی است؟ (چشم‌انداز و انگیزه درونی):
                </label>
                <textarea
                  rows={2}
                  placeholder="دستیابی به این هدف چه تغییری در کیفیت زندگی یا هویت شما ایجاد می‌کند؟"
                  value={annualVisionWhy}
                  onChange={(e) => setAnnualVisionWhy(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-hidden bg-white text-xs"
                />
              </div>

              {/* Category & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection */}
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
                  <label className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-emerald-600" />
                    <span>دسته‌بندی کلی هدف:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => {
                      const isSel = annualCategoryId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setAnnualCategoryId(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all flex items-center gap-1 ${
                            isSel
                              ? 'text-white font-bold shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                          style={{
                            backgroundColor: isSel ? c.colorHex : undefined,
                            borderColor: isSel ? c.colorHex : `${c.colorHex}40`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSel ? '#fff' : c.colorHex }} />
                          <span>{c.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    اهداف میانی فصلی و ماهانه نیز همین دسته‌بندی را به طور خودکار به ارث می‌برند.
                  </p>
                </div>

                {/* Target Year */}
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>سال برنامه‌ریزی هدف:</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                      امسال یا سال آینده
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {allowedGoalYears.map((y) => {
                      const isSel = annualYear === y;
                      const isCurrentYear = y === today.year;
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setAnnualYear(y);
                            setAnnualYearError(null);
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isSel
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs font-bold'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-200'
                          }`}
                        >
                          <span className="text-sm font-black">{toPersianDigits(y)}</span>
                          <span className={`text-[10px] font-semibold ${isSel ? 'text-emerald-100' : 'text-gray-500'}`}>
                            {isCurrentYear ? 'سال جاری (امسال)' : 'سال آینده (پیش‌رو)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {annualYearError && (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{annualYearError}</span>
                    </p>
                  )}

                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    تعریف هدف برای سال‌های گذشته مجاز نیست. اطلاعات، تسک‌ها و اهداف سال‌های قبل در بخش آرشیو و فیلتر سال‌ها قابل مشاهده هستند.
                  </p>
                </div>
              </div>

              {/* Start Date Timing */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <label className="font-bold text-gray-800 block">زمان شروع برنامه‌ریزی هدف:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStartTimingType('TODAY')}
                    className={`p-2 rounded-lg border text-right cursor-pointer transition-all ${
                      startTimingType === 'TODAY'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    از همین امروز ({toPersianDigits(todayStr)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTimingType('YEAR_START')}
                    className={`p-2 rounded-lg border text-right cursor-pointer transition-all ${
                      startTimingType === 'YEAR_START'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    از ابتدای سال (۱ فروردین {toPersianDigits(annualYear)})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: INTERMEDIATE GOALS (SEASONS & MONTHS) ================= */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Inherited Category Lock Banner - Strictly enforced */}
              <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 text-xs block">
                      دسته‌بندی اهداف میانی (همگام با هدف سالانه):
                    </span>
                    <span className="text-[11px] text-gray-500 truncate block">
                      دسته‌بندی مراحل میانی یکسان با هدف کلان سالانه است و نیاز به انتخاب مجدد ندارد.
                    </span>
                  </div>
                </div>

                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border shrink-0"
                  style={{
                    backgroundColor: `${annualCategory.colorHex}15`,
                    color: annualCategory.colorHex,
                    borderColor: `${annualCategory.colorHex}40`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: annualCategory.colorHex }} />
                  <span>{annualCategory.title}</span>
                </span>
              </div>

              {/* Tab Switcher: Seasonal Goals vs Monthly Goals */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIntermediateTab('SEASONS')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                      intermediateTab === 'SEASONS'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>اهداف فصلی (۴ فصل سال)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntermediateTab('MONTHS')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                      intermediateTab === 'MONTHS'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>اهداف میانی ماهانه</span>
                    {monthlyDrafts.length > 0 && (
                      <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                        {toPersianDigits(monthlyDrafts.length)}
                      </span>
                    )}
                  </button>
                </div>

                <span className="text-[11px] text-gray-400">
                  می‌توانید برای هر فصل یا هر ماه هدفی مشخص کنید
                </span>
              </div>

              {/* Sub-view 1: Four Seasons of the Year */}
              {intermediateTab === 'SEASONS' && (
                <div className="space-y-3">
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    برای هر فصلی که مایلید گام میانی بردارید، عنوان آن را تکمیل کنید. می‌توانید برای هر ۴ فصل سال اهداف متناظر بنویسید:
                  </p>

                  <div className="space-y-2.5">
                    {SEASONS_CONFIG.map((s) => {
                      const draft = seasonalDrafts[s.index];
                      const isCurrent = s.index === currentSeasonIdx;

                      return (
                        <div
                          key={s.index}
                          className={`p-3 rounded-xl border transition-all ${
                            draft.enabled || draft.title.trim()
                              ? 'bg-white border-emerald-300 shadow-2xs'
                              : 'bg-gray-50/70 border-gray-200 opacity-90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{s.icon}</span>
                              <span className="font-bold text-gray-900 text-xs">
                                فصل {s.name}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({s.months})
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  فصل جاری
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleSeason(s.index)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                draft.enabled
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {draft.enabled ? '✓ فعال شده' : '+ فعال‌سازی'}
                            </button>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder={`عنوان هدف برای فصل ${s.name} (مثلاً: پایان نگارش نسخه اولیه)`}
                              value={draft.title}
                              onChange={(e) => updateSeasonTitle(s.index, e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold focus:border-emerald-500 outline-hidden"
                            />
                            {draft.enabled && (
                              <input
                                type="text"
                                placeholder="توضیحات تکمیلی یا خروجی مورد انتظار این فصل (اختیاری)"
                                value={draft.description}
                                onChange={(e) => updateSeasonDesc(s.index, e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 outline-hidden"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-view 2: Monthly Goals */}
              {intermediateTab === 'MONTHS' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-700" />
                      <span className="font-bold text-indigo-950 text-xs">
                        افزودن هدف میانی ماهانه:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={newMonthToAdd}
                        onChange={(e) => setNewMonthToAdd(Number(e.target.value))}
                        className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 text-xs font-semibold text-gray-800"
                      >
                        {PERSIAN_MONTHS.map((mName, i) => (
                          <option key={i + 1} value={i + 1}>
                            ماه {mName}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={addMonthlyDraft}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن این ماه</span>
                      </button>
                    </div>
                  </div>

                  {monthlyDrafts.length === 0 ? (
                    <div className="p-6 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                      هنوز هدف ماهانه‌ای اضافه نشده است. می‌توانید با استفاده از دکمه بالا برای ماه‌های دلخواه هدف میانی تعیین کنید.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {monthlyDrafts.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-white border border-gray-200 rounded-xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                                ماه {PERSIAN_MONTHS[m.monthIndex - 1]}
                              </span>
                              <select
                                value={m.monthIndex}
                                onChange={(e) => updateMonthlyDraft(m.id, 'monthIndex', Number(e.target.value))}
                                className="text-[10px] text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50"
                              >
                                {PERSIAN_MONTHS.map((mn, idx) => (
                                  <option key={idx + 1} value={idx + 1}>
                                    تغییر به: {mn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeMonthlyDraft(m.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="حذف این هدف ماهانه"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder={`عنوان هدف برای ماه ${PERSIAN_MONTHS[m.monthIndex - 1]}`}
                            value={m.title}
                            onChange={(e) => updateMonthlyDraft(m.id, 'title', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold focus:border-indigo-500 outline-hidden"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: ACTIONABLE MICRO-TASK & MICRO-HABIT ================= */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-gray-600 leading-relaxed">
                هر هدف بزرگ برای آغاز، به یک تسک اولیه در تقویم و یک عادت مداوم نیاز دارد:
              </p>

              {/* Target Goal Attachment Selector */}
              {availableCreatedIntermediateGoals.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                  <label className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span>اتصال این اقدامات به کدام سطح از هدف؟</span>
                  </label>
                  <select
                    value={targetGoalChoice}
                    onChange={(e) => setTargetGoalChoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold bg-white text-gray-900"
                  >
                    <option value="ANNUAL">هدف کلان سالانه («{annualTitle}»)</option>
                    {availableCreatedIntermediateGoals.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Initial Task */}
              <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-sky-950 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMicroTask}
                      onChange={(e) => setHasMicroTask(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                    />
                    <EntityIcon type="TASK" size="xs" showBackground={false} />
                    <span>تعریف اولین اقدام اجرایی (تسک اولیه)</span>
                  </label>
                  <EntityBadge type="TASK" size="xs" />
                </div>

                {hasMicroTask && (
                  <div className="space-y-2 pt-1 border-t border-sky-200/60">
                    <input
                      type="text"
                      placeholder="مثلاً: ثبت‌نام در آزمون تعیین سطح یا خرید کتاب راهنما"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold focus:border-sky-500 outline-hidden"
                    />
                    <div className="flex items-center gap-3 text-[11px] text-gray-600">
                      <span>زمان تخمینی تمرکز:</span>
                      <select
                        value={taskTimerMinutes}
                        onChange={(e) => setTaskTimerMinutes(Number(e.target.value))}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-white font-medium text-xs"
                      >
                        <option value={15}>۱۵ دقیقه</option>
                        <option value={25}>۲۵ دقیقه (پومودورو)</option>
                        <option value={45}>۴۵ دقیقه</option>
                        <option value={60}>۱ ساعت</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Habit */}
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-amber-950 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMicroHabit}
                      onChange={(e) => setHasMicroHabit(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <EntityIcon type="HABIT" size="xs" showBackground={false} />
                    <span>تعریف عادت روزانه برای استمرار</span>
                  </label>
                  <EntityBadge type="HABIT" size="xs" />
                </div>

                {hasMicroHabit && (
                  <div className="space-y-2 pt-1 border-t border-amber-200/60">
                    <input
                      type="text"
                      placeholder="مثلاً: روزی ۲۰ دقیقه مطالعه زبان انگلیسی یا تمرین کششی"
                      value={habitTitle}
                      onChange={(e) => setHabitTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold focus:border-amber-500 outline-hidden"
                    />
                    <div className="flex items-center gap-3 text-[11px] text-gray-600">
                      <span>مدت زمان روزانه:</span>
                      <select
                        value={habitTimerMinutes}
                        onChange={(e) => setHabitTimerMinutes(Number(e.target.value))}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-white font-medium text-xs"
                      >
                        <option value={10}>۱۰ دقیقه</option>
                        <option value={15}>۱۵ دقیقه</option>
                        <option value={20}>۲۰ دقیقه</option>
                        <option value={30}>۳۰ دقیقه</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/90 flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(prev => (prev - 1) as 1 | 2)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 text-xs cursor-pointer transition-colors"
              >
                انصراف
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 && !annualTitle.trim()}
                onClick={() => setStep(prev => (prev + 1) as 2 | 3)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
              >
                <span>مرحله بعد</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!annualTitle.trim()}
                onClick={handleFinish}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ثبت و ایجاد ساختار هدف</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
