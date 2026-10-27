import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Goal, GoalPeriod, GoalStatus, GoalHistoryEntry, Category } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  PERSIAN_MONTHS, 
  getCurrentPersianDateTimeString,
  isSeasonPast,
  isMonthPast,
  isYearPast
} from '../calendar/jalali';
import { X, Target, Calendar, Folder, Sprout, Check, Sparkles, Edit3, AlertCircle, Lock, Repeat } from 'lucide-react';
import { PlantIcon, ALL_PLANT_TYPES } from './PlantIcon';

interface Props {
  isOpen: boolean;
  goal?: Goal | null;
  categories: Category[];
  existingGoals: Goal[];
  onClose: () => void;
  onSave: (goal: Goal) => void;
}

const SEASON_OPTIONS = [
  { index: 0, name: 'بهار', icon: '🌸', activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs', inactiveClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
  { index: 1, name: 'تابستان', icon: '☀️', activeClass: 'bg-amber-600 text-white border-amber-700 shadow-xs', inactiveClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
  { index: 2, name: 'پاییز', icon: '🍂', activeClass: 'bg-orange-600 text-white border-orange-700 shadow-xs', inactiveClass: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100' },
  { index: 3, name: 'زمستان', icon: '❄️', activeClass: 'bg-sky-600 text-white border-sky-700 shadow-xs', inactiveClass: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100' },
];

export const GoalModal: React.FC<Props> = ({
  isOpen,
  goal,
  categories,
  existingGoals,
  onClose,
  onSave,
}) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);

  // Check if this is truly editing an existing goal
  const isEdit = Boolean(goal && goal.id && existingGoals.some(g => g.id === goal.id));

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [visionWhy, setVisionWhy] = useState('');
  const [year, setYear] = useState<number>(today.year);
  const [isCustomYear, setIsCustomYear] = useState(false);
  const [customYearInput, setCustomYearInput] = useState<string>(today.year.toString());
  const [period, setPeriod] = useState<GoalPeriod>('ANNUAL');
  const [status, setStatus] = useState<GoalStatus>('IN_PROGRESS');
  const [startDate, setStartDate] = useState(todayStr);
  const [seasonIndex, setSeasonIndex] = useState<number>(Math.floor((today.month - 1) / 3));
  const [monthIndex, setMonthIndex] = useState<number>(today.month);
  const [parentId, setParentId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || 'cat-work');
  const [plantType, setPlantType] = useState<string>('بونسای');
  const [isInheritedFromParent, setIsInheritedFromParent] = useState(false);
  const [continuesGoalId, setContinuesGoalId] = useState<string | null>(null);

  // Allowed selectable years: strictly current year and at most 1 year ahead
  // If editing an existing historical goal, its past year is retained for viewing/updating
  const selectableYears = useMemo(() => {
    const list = [today.year, today.year + 1];
    if (isEdit && goal?.year && !list.includes(goal.year)) {
      list.push(goal.year);
      list.sort((a, b) => a - b);
    }
    return list;
  }, [isEdit, goal?.year, today.year]);

  // Find parent goal if parentId exists
  const parentGoal = existingGoals.find(g => g.id === parentId);

  // Synchronize state on open or whenever goal/existingGoals change
  useEffect(() => {
    if (!isOpen) return;
    setTitleError('');

    if (isEdit && goal) {
      setTitle(goal.title || '');
      setDescription(goal.description || '');
      setVisionWhy(goal.visionWhy || '');
      
      const goalYear = goal.year || today.year;
      setYear(goalYear);
      setCustomYearInput(goalYear.toString());
      setIsCustomYear(!standardYears.includes(goalYear));

      setPeriod(goal.period || 'ANNUAL');
      setStatus(goal.status || 'IN_PROGRESS');
      setStartDate(goal.startDate || todayStr);
      setSeasonIndex(goal.seasonIndex ?? 0);
      setMonthIndex(goal.monthIndex ?? today.month);
      setParentId(goal.parentId || null);
      setCategoryId(goal.categoryId || categories[0]?.id || 'cat-work');
      setPlantType(goal.plantType || 'بونسای');
      setIsInheritedFromParent(Boolean(goal.parentId));
      setContinuesGoalId(goal.continuesGoalId || null);
    } else {
      // New Goal mode
      const passedParentId = goal?.parentId || null;
      setContinuesGoalId(goal?.continuesGoalId || null);
      const foundParent = existingGoals.find(g => g.id === passedParentId);

      setTitle(goal?.title || '');
      setDescription(goal?.description || '');
      setVisionWhy(goal?.visionWhy || '');
      
      const defaultYear = foundParent?.year || goal?.year || today.year;
      setYear(defaultYear);
      setCustomYearInput(defaultYear.toString());
      setIsCustomYear(false);

      // Period auto-selection: if parent is seasonal -> monthly, if parent is annual -> seasonal
      let defaultPeriod = goal?.period;
      if (!defaultPeriod) {
        if (foundParent) {
          defaultPeriod = foundParent.period === 'SEASONAL' ? 'MONTHLY' : 'SEASONAL';
        } else {
          defaultPeriod = 'ANNUAL';
        }
      }
      setPeriod(defaultPeriod);
      setStatus('IN_PROGRESS');
      setStartDate(goal?.startDate || todayStr);

      const defSeason = goal?.seasonIndex ?? foundParent?.seasonIndex ?? Math.floor((today.month - 1) / 3);
      setSeasonIndex(defSeason);

      // Default month based on season or current month
      let defMonth = goal?.monthIndex ?? today.month;
      if (foundParent && foundParent.period === 'SEASONAL' && foundParent.seasonIndex !== undefined) {
        const seasonStartMonth = foundParent.seasonIndex * 3 + 1;
        defMonth = seasonStartMonth;
      }
      setMonthIndex(defMonth);

      setParentId(passedParentId);

      // Category and Plant inheritance from parent!
      if (foundParent) {
        setCategoryId(foundParent.categoryId || categories[0]?.id || 'cat-work');
        setPlantType(foundParent.plantType || 'بونسای');
        setIsInheritedFromParent(true);
      } else {
        const initialCatId = goal?.categoryId || categories[0]?.id || 'cat-work';
        setCategoryId(initialCatId);
        const matchingCat = categories.find(c => c.id === initialCatId);
        setPlantType(goal?.plantType || matchingCat?.plantType || 'بونسای');
        setIsInheritedFromParent(false);
      }
    }
  }, [isOpen, goal, isEdit]);

  // Handle parent change with category & plant inheritance
  const handleParentChange = (newParentId: string | null) => {
    setParentId(newParentId);
    if (newParentId) {
      const found = existingGoals.find(g => g.id === newParentId);
      if (found) {
        if (found.categoryId) setCategoryId(found.categoryId);
        if (found.plantType) setPlantType(found.plantType);
        if (found.year) setYear(found.year);
        if (found.period === 'SEASONAL' && found.seasonIndex !== undefined) {
          setSeasonIndex(found.seasonIndex);
          setMonthIndex(found.seasonIndex * 3 + 1);
          setPeriod('MONTHLY');
        } else if (found.period === 'ANNUAL') {
          setPeriod('SEASONAL');
        }
        setIsInheritedFromParent(true);
      }
    } else {
      setIsInheritedFromParent(false);
    }
  };

  // Handle category change: also adapt default plant if defined in category
  const handleCategorySelect = (catId: string) => {
    setCategoryId(catId);
    const catObj = categories.find(c => c.id === catId);
    if (catObj?.plantType) {
      setPlantType(catObj.plantType);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('لطفاً عنوان هدف را وارد نمایید');
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const effectiveYear = isCustomYear 
      ? (parseInt(customYearInput, 10) || today.year)
      : year;

    // Check if user is trying to create a NEW goal for an invalid period
    if (!isEdit) {
      if (effectiveYear < today.year) {
        setTitleError(`امکان تعریف هدف جدید برای سال گذشته (${toPersianDigits(effectiveYear)}) وجود ندارد. اطلاعات سال‌های قبل جهت مشاهده و آرشیو نگهداری می‌شوند.`);
        return;
      }
      if (effectiveYear > today.year + 1) {
        setTitleError(`تعریف هدف حداکثر تا یک سال بعد (${toPersianDigits(today.year + 1)}) امکان‌پذیر است.`);
        return;
      }
      if (period === 'ANNUAL' && isYearPast(effectiveYear, today)) {
        setTitleError(`امکان تعریف هدف جدید برای سال گذشته (${toPersianDigits(effectiveYear)}) وجود ندارد.`);
        return;
      }
      if (period === 'SEASONAL' && isSeasonPast(effectiveYear, seasonIndex ?? 0, today)) {
        const sName = SEASON_OPTIONS[seasonIndex ?? 0]?.name || 'انتخاب‌شده';
        setTitleError(`امکان تعریف هدف جدید برای فصل تمام‌شده (${sName} سال ${toPersianDigits(effectiveYear)}) وجود ندارد.`);
        return;
      }
      if (period === 'MONTHLY' && isMonthPast(effectiveYear, monthIndex, today)) {
        const mName = PERSIAN_MONTHS[monthIndex - 1] || 'انتخاب‌شده';
        setTitleError(`امکان تعریف هدف جدید برای ماه تمام‌شده (${mName} سال ${toPersianDigits(effectiveYear)}) وجود ندارد.`);
        return;
      }
    }

    setTitleError('');

    const timestampNow = getCurrentPersianDateTimeString();

    let history: GoalHistoryEntry[] = isEdit && goal?.history ? [...goal.history] : [];

    if (!isEdit) {
      // Brand new goal
      history.push({
        id: `hist-${Date.now()}`,
        timestamp: timestampNow,
        action: 'CREATED',
        description: `ایجاد هدف ${period === 'ANNUAL' ? 'سالانه' : period === 'SEASONAL' ? 'میانی فصلی' : 'میانی ماهانه'} برای سال ${toPersianDigits(effectiveYear)}`,
      });
    } else if (goal) {
      // Edited goal - record what was changed
      const changes: string[] = [];
      if (goal.title !== title.trim()) changes.push(`عنوان: «${title.trim()}»`);
      if (goal.year !== effectiveYear) changes.push(`سال: ${toPersianDigits(effectiveYear)}`);
      if (goal.categoryId !== categoryId) {
        const c = categories.find(cat => cat.id === categoryId);
        changes.push(`دسته‌بندی: ${c?.title || categoryId}`);
      }
      if (goal.status !== status) {
        const statusMap: Record<GoalStatus, string> = {
          NOT_STARTED: 'شروع نشده',
          IN_PROGRESS: 'در حال انجام',
          COMPLETED: 'تکمیل شده',
          PAUSED: 'متوقف شده',
        };
        changes.push(`وضعیت: ${statusMap[status]}`);
      }
      if (goal.period !== period) changes.push(`نوع بازه: ${period}`);

      const desc = changes.length > 0 
        ? `ویرایش مشخصات: ${changes.join('، ')}`
        : 'ویرایش و بروزرسانی هدف';

      history.push({
        id: `hist-${Date.now()}`,
        timestamp: timestampNow,
        action: goal.status !== status ? 'STATUS_CHANGED' : 'EDITED',
        description: desc,
        previousValues: {
          title: goal.title,
          description: goal.description,
          period: goal.period,
          status: goal.status,
        },
      });
    }

    const finalGoal: Goal = {
      id: isEdit && goal ? goal.id : `goal-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      visionWhy: visionWhy.trim(),
      year: effectiveYear,
      period,
      status,
      startDate: startDate || todayStr,
      seasonIndex: period === 'SEASONAL' ? seasonIndex : undefined,
      monthIndex: period === 'MONTHLY' ? monthIndex : undefined,
      parentId: parentId || null,
      categoryId,
      plantType,
      manualProgress: isEdit && goal ? goal.manualProgress : undefined,
      isManualProgressActive: isEdit && goal ? goal.isManualProgressActive : undefined,
      continuesGoalId: period === 'SEASONAL' ? (continuesGoalId || null) : null,
      originTaskId: goal?.originTaskId || null,
      history,
      createdAt: isEdit && goal ? goal.createdAt : todayStr,
    };

    onSave(finalGoal);
    onClose();
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-emerald-100 flex flex-col max-h-[94vh] max-h-[94dvh] overflow-hidden my-auto animate-scale-up relative shrink-0">
        {/* Sticky Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isEdit ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {isEdit ? <Edit3 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                {isEdit ? 'ویرایش هدف انتخابی' : 'تعریف هدف جدید'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isEdit 
                  ? `ویرایش و بروزرسانی هدف «${title || goal?.title || ''}»`
                  : 'مشخصات، دسته‌بندی، سال و زمانبندی هدف جدید'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="goal-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 text-xs">
          {/* Title - PROMINENT & ALWAYS VISIBLE */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-300/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>
                  عنوان هدف {period === 'SEASONAL' ? 'فصلی' : period === 'MONTHLY' ? 'ماهانه' : 'سالانه'} *
                </span>
              </label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                الزامی
              </span>
            </div>
            <input
              ref={titleInputRef}
              type="text"
              autoFocus
              placeholder={
                period === 'SEASONAL'
                  ? 'مثلاً: دویدن ۱۵ کیلومتر در هوای پاییزی یا مطالعه کتاب'
                  : period === 'MONTHLY'
                  ? 'مثلاً: اجرای برنامه تمرینی این ماه'
                  : 'مثلاً: یادگیری مکالمه انگلیسی یا توسعه محصول جدید'
              }
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError('');
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white outline-hidden transition-all text-xs font-semibold ${
                titleError 
                  ? 'border-rose-400 ring-2 ring-rose-100 text-rose-900' 
                  : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900'
              }`}
            />
            {titleError && (
              <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{titleError}</span>
              </p>
            )}

            {/* Quick Title Suggestion when parent goal exists */}
            {parentGoal && (
              <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-gray-500 font-medium">💡 پیشنهاد عنوان:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sName = seasonIndex !== undefined ? SEASON_OPTIONS[seasonIndex]?.name : 'فصل';
                    setTitle(period === 'SEASONAL' ? `گام فصل ${sName}: ${parentGoal.title}` : `گام ماهانه: ${parentGoal.title}`);
                    if (titleError) setTitleError('');
                  }}
                  className="text-[10px] text-emerald-800 bg-white hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                >
                  {period === 'SEASONAL' 
                    ? `«گام فصل ${SEASON_OPTIONS[seasonIndex ?? 0]?.name}: ${parentGoal.title}»`
                    : `«گام: ${parentGoal.title}»`}
                </button>
              </div>
            )}
          </div>

          {/* Parent Goal link (if intermediate) */}
          {period !== 'ANNUAL' && (
            <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>هدف بالادستی (ارث‌بری خودکار دسته و گیاه)</span>
                </label>
                {parentGoal && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                    ارث‌بری فعال
                  </span>
                )}
              </div>

              <select
                value={parentId || ''}
                onChange={(e) => handleParentChange(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-medium"
              >
                <option value="">بدون هدف مادر (مستقل)</option>
                {/* Group 1: Seasonal Goals (Best parents for Monthly goals) */}
                {period === 'MONTHLY' && existingGoals.some(g => g.id !== goal?.id && g.period === 'SEASONAL') && (
                  <optgroup label="--- اهداف میانی فصلی (پیشنهادی برای ماه) ---">
                    {existingGoals
                      .filter(g => g.id !== goal?.id && g.period === 'SEASONAL')
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          فصل {g.seasonIndex !== undefined ? SEASON_OPTIONS[g.seasonIndex]?.name : ''} (سال {toPersianDigits(g.year)}): {g.title}
                        </option>
                      ))}
                  </optgroup>
                )}
                {/* Group 2: Annual Goals */}
                <optgroup label="--- اهداف کلان سالانه ---">
                  {existingGoals
                    .filter(g => g.id !== goal?.id && g.period === 'ANNUAL')
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        هدف سالانه {toPersianDigits(g.year)}: {g.title}
                      </option>
                    ))}
                </optgroup>
              </select>

              {parentGoal && (
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      ارث‌بری از: <strong>{parentGoal.title}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {parentGoal.categoryId && (
                      <span className="text-[10px] text-gray-600">
                        ({categories.find(c => c.id === parentGoal.categoryId)?.title || 'دسته'})
                      </span>
                    )}
                    {parentGoal.plantType && <PlantIcon type={parentGoal.plantType} size="xs" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Continuation / Prerequisite Seasonal Goal */}
          {period === 'SEASONAL' && (
            <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-sky-600" />
                  <span>هدف فصلی پیش‌نیاز / ادامه کدام هدف است؟</span>
                </label>
                {continuesGoalId && (
                  <span className="text-[10px] text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-md font-semibold">
                    🔗 در امتداد هدف قبلی
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed">
                اگر این هدف در امتداد هدف فصلی دیگری تعریف شده (مثلاً پاییز در ادامه زمستان یا تابستان)، آن را انتخاب کنید تا پیوستگی اهداف و انتقال تسک‌ها حفظ شود.
              </p>

              <select
                value={continuesGoalId || ''}
                onChange={(e) => setContinuesGoalId(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-medium"
              >
                <option value="">(بدون پیش‌نیاز / هدف فصلی مستقل)</option>
                {existingGoals
                  .filter(g => g.id !== goal?.id && g.period === 'SEASONAL')
                  .map(g => (
                    <option key={g.id} value={g.id}>
                      فصل {g.seasonIndex !== undefined ? SEASON_OPTIONS[g.seasonIndex]?.name : ''} ({toPersianDigits(g.year)}): {g.title}
                    </option>
                  ))}
              </select>

              {continuesGoalId && (
                <div className="text-[11px] text-sky-900 bg-white p-2 rounded-lg border border-sky-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    این هدف در ادامه هدف «<strong>{existingGoals.find(g => g.id === continuesGoalId)?.title}</strong>» تعریف شده است.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Category Selection (دسته‌بندی هدف) - PROMINENT */}
          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-emerald-600" />
                <span>تعیین دسته‌بندی هدف *</span>
              </label>
              <div className="flex items-center gap-1.5">
                {isInheritedFromParent && parentGoal && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-semibold">
                    ارث‌بری شده از هدف والد
                  </span>
                )}
                {selectedCategory && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                    style={{
                      backgroundColor: `${selectedCategory.colorHex}15`,
                      color: selectedCategory.colorHex,
                      borderColor: `${selectedCategory.colorHex}40`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedCategory.colorHex }}
                    />
                    <span>{selectedCategory.title}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Visual Category Chips or Locked Inherited Info */}
            {parentGoal ? (
              <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    دسته‌بندی این مرحله میانی یکسان با هدف مادر («{parentGoal.title}») است و به طور خودکار تعیین شده است.
                  </span>
                </div>
                {selectedCategory && (
                  <span
                    className="px-2 py-0.5 rounded-md font-bold text-[11px] shrink-0 border"
                    style={{
                      backgroundColor: `${selectedCategory.colorHex}20`,
                      color: selectedCategory.colorHex,
                      borderColor: `${selectedCategory.colorHex}50`,
                    }}
                  >
                    {selectedCategory.title}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategorySelect(c.id)}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'text-white shadow-xs font-bold'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? c.colorHex : undefined,
                        borderColor: isSelected ? c.colorHex : `${c.colorHex}40`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? '#ffffff' : c.colorHex }}
                      />
                      <span>{c.title}</span>
                      {c.plantType && (
                        <span className="text-[10px] opacity-80">({c.plantType})</span>
                      )}
                      {isSelected && <Check className="w-3 h-3 text-white mr-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vision Why */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              چرا این هدف مهم است؟ (چرایی و انگیزه اصلی)
            </label>
            <textarea
              rows={2}
              placeholder="ارزش، انگیزه و دستاورد نهایی این هدف برای شما..."
              value={visionWhy}
              onChange={(e) => setVisionWhy(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all text-xs"
            />
          </div>

          {/* Period & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">نوع بازه زمانی هدف</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-medium"
              >
                <option value="ANNUAL">هدف کلان سالانه (یک سال کامل)</option>
                <option value="SEASONAL">هدف میانی فصلی (یک فصل)</option>
                <option value="MONTHLY">هدف میانی ماهانه (یک ماه)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">وضعیت هدف</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-medium"
              >
                <option value="NOT_STARTED">شروع نشده</option>
                <option value="IN_PROGRESS">در حال انجام</option>
                <option value="COMPLETED">تکمیل شده</option>
                <option value="PAUSED">متوقف شده</option>
              </select>
            </div>
          </div>

          {/* Year Selection (برای سال جاری یا حداکثر یک سال بعد) */}
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>تعیین سال هدف</span>
              </label>
              <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                امسال یا سال آینده
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs bg-white font-semibold"
                >
                  {selectableYears.map((y) => {
                    const isCurrentYear = y === today.year;
                    const isNextYear = y === today.year + 1;
                    const isPast = y < today.year;
                    const label = isCurrentYear
                      ? `سال ${toPersianDigits(y)} (سال جاری)`
                      : isNextYear
                      ? `سال ${toPersianDigits(y)} (سال آینده)`
                      : isPast
                      ? `سال ${toPersianDigits(y)} (آرشیو سال گذشته)`
                      : `سال ${toPersianDigits(y)}`;

                    return (
                      <option key={y} value={y} disabled={!isEdit && isPast}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder={todayStr}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs bg-white"
                  title="تاریخ فعال‌سازی"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed">
              تعریف هدف تنها برای سال جاری ({toPersianDigits(today.year)}) یا حداکثر یک سال بعد ({toPersianDigits(today.year + 1)}) امکان‌پذیر است. سال‌های گذشته برای مشاهده و گزارش‌گیری در دسترس هستند.
            </p>
          </div>

          {/* Sub-period: Seasonal with Distinct Seasonal Colors */}
          {period === 'SEASONAL' && (
            <div className="space-y-2 p-3 rounded-xl border border-emerald-200 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-gray-800">
                  کدام فصل سال؟ (تعیین برای فصل‌های باقیمانده)
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md font-semibold">
                  سال {toPersianDigits(isCustomYear ? (parseInt(customYearInput, 10) || today.year) : year)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEASON_OPTIONS.map((s) => {
                  const isSelected = seasonIndex === s.index;
                  const effYear = isCustomYear ? (parseInt(customYearInput, 10) || today.year) : year;
                  const currentSeason = Math.floor((today.month - 1) / 3);
                  let badgeText = '';
                  let badgeColor = '';

                  if (effYear === today.year) {
                    if (s.index === currentSeason) {
                      badgeText = 'فصل جاری';
                      badgeColor = 'bg-emerald-500 text-white';
                    } else if (s.index > currentSeason) {
                      badgeText = 'باقیمانده';
                      badgeColor = 'bg-blue-500 text-white';
                    } else {
                      badgeText = 'گذشته';
                      badgeColor = 'bg-gray-400 text-white';
                    }
                  } else if (effYear > today.year) {
                    badgeText = 'باقیمانده';
                    badgeColor = 'bg-indigo-500 text-white';
                  }

                  return (
                    <button
                      key={s.index}
                      type="button"
                      onClick={() => setSeasonIndex(s.index)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer relative ${
                        isSelected ? s.activeClass : s.inactiveClass
                      }`}
                    >
                      {badgeText && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold absolute -top-2 right-1 shadow-2xs ${badgeColor}`}>
                          {badgeText}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{s.icon}</span>
                        <span>{s.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-period: Monthly */}
          {period === 'MONTHLY' && (
            <div className="space-y-2 p-3 rounded-xl border border-teal-200 bg-teal-50/40">
              <label className="block font-bold text-gray-800">
                کدام ماه سال؟ (ماه‌های متناظر فصل)
              </label>
              
              {/* Quick Month Buttons if parent is seasonal */}
              {parentGoal && parentGoal.period === 'SEASONAL' && parentGoal.seasonIndex !== undefined && (
                <div className="space-y-1">
                  <span className="text-[11px] text-teal-800 font-semibold block">
                    ماه‌های فصل {SEASON_OPTIONS[parentGoal.seasonIndex]?.name}:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((mOffset) => {
                      const mNumber = parentGoal.seasonIndex! * 3 + mOffset;
                      const isSelected = monthIndex === mNumber;
                      return (
                        <button
                          key={mNumber}
                          type="button"
                          onClick={() => setMonthIndex(mNumber)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                              : 'bg-white text-teal-900 border-teal-200 hover:bg-teal-100'
                          }`}
                        >
                          {PERSIAN_MONTHS[mNumber - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <select
                value={monthIndex}
                onChange={(e) => setMonthIndex(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white mt-1"
              >
                {PERSIAN_MONTHS.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    ماه {m} ({toPersianDigits(idx + 1)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Plant Mascot */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-600" />
              <span>گیاه یا درخت نمادین این هدف در باغچه</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <PlantIcon type={plantType} size="sm" />
              </div>
              <select
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
              >
                {ALL_PLANT_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Description */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">توضیحات و یادداشت تکمیلی</label>
            <textarea
              rows={2}
              placeholder="نکات اجرایی، شاخص‌های موفقیت و مراحل..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs"
            />
          </div>

        </form>

        {/* Sticky Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-gray-100 bg-gray-50/95 backdrop-blur-xs flex items-center justify-end gap-2.5 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="submit"
            form="goal-form"
            className={`px-5 py-2 rounded-xl text-white font-bold text-xs transition-all shadow-xs cursor-pointer ${
              isEdit
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isEdit ? 'ذخیره تغییرات هدف' : 'ایجاد و ثبت هدف جدید'}
          </button>
        </div>
      </div>
    </div>
  );
};
