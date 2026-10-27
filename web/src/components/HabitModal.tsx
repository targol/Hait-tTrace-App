import React, { useState, useEffect } from 'react';
import { Habit, Category, Goal } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  WEEKDAYS_SHORT, 
  toPersianDigits, 
  PERSIAN_MONTHS,
  isSeasonPast,
  isMonthPast,
  isYearPast
} from '../calendar/jalali';
import { X, Folder, Target, Clock, ShieldCheck, Sprout, Edit3, Plus, Archive, Sparkles, Copy } from 'lucide-react';
import { PlantIcon, ALL_PLANT_TYPES } from './PlantIcon';

interface Props {
  isOpen: boolean;
  habit?: Habit | null;
  categories: Category[];
  goals: Goal[];
  isDuplicate?: boolean;
  onClose: () => void;
  onSave: (habit: Habit) => void;
}

export const HabitModal: React.FC<Props> = ({
  isOpen,
  habit,
  categories,
  goals,
  isDuplicate = false,
  onClose,
  onSave,
}) => {
  const today = getTodayJalali();
  const isEdit = Boolean(habit && habit.id);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [targetDays, setTargetDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [exemptHolidays, setExemptHolidays] = useState(false);
  const [exemptWeekends, setExemptWeekends] = useState(false);
  const [plantType, setPlantType] = useState(ALL_PLANT_TYPES[0].id);
  const [isInheritedFromGoal, setIsInheritedFromGoal] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize state when modal opens or habit prop changes
  useEffect(() => {
    if (!isOpen) {
      setIsDuplicateMode(false);
      setErrorMessage('');
      return;
    }

    setErrorMessage('');
    const dupl = Boolean(isDuplicate);
    setIsDuplicateMode(dupl);

    if (habit) {
      let initTitle = habit.title || '';
      if (dupl && !initTitle.includes('(کپی)')) {
        initTitle = `${initTitle} (کپی)`;
      }
      setTitle(initTitle);
      setNotes(habit.notes || '');
      const linkedGoal = goals.find(g => g.id === habit.goalId);
      setCategoryId(habit.categoryId || linkedGoal?.categoryId || categories[0]?.id || 'cat-health');
      setGoalId(habit.goalId || null);
      setTimerMinutes(habit.timerMinutes !== undefined ? habit.timerMinutes : 15);
      setTargetDays(
        habit.targetDaysOfWeek && habit.targetDaysOfWeek.length > 0 
          ? habit.targetDaysOfWeek 
          : [0, 1, 2, 3, 4, 5, 6]
      );
      setExemptHolidays(Boolean(habit.exemptHolidays));
      setExemptWeekends(Boolean(habit.exemptWeekends));
      setPlantType(habit.plantType || linkedGoal?.plantType || categories[0]?.plantType || ALL_PLANT_TYPES[0].id);
      setIsInheritedFromGoal(Boolean(habit.goalId));
      setIsClosed(Boolean(habit.isClosed));
    } else {
      setTitle('');
      setNotes('');
      const defaultCat = categories[0]?.id || 'cat-health';
      setCategoryId(defaultCat);
      setGoalId(null);
      setTimerMinutes(15);
      setTargetDays([0, 1, 2, 3, 4, 5, 6]);
      setExemptHolidays(false);
      setExemptWeekends(false);
      const catObj = categories.find(c => c.id === defaultCat);
      setPlantType(catObj?.plantType || ALL_PLANT_TYPES[0].id);
      setIsInheritedFromGoal(false);
      setIsClosed(false);
    }
  }, [isOpen, habit, categories, goals, isDuplicate]);

  if (!isOpen) return null;

  const handleDuplicateCurrentHabit = () => {
    setIsDuplicateMode(true);
    if (!title.includes('(کپی)')) {
      setTitle(prev => `${prev} (کپی)`);
    }
  };

  const handleGoalChange = (newGoalId: string | null) => {
    setGoalId(newGoalId);
    if (newGoalId) {
      const g = goals.find(item => item.id === newGoalId);
      if (g) {
        if (g.categoryId) setCategoryId(g.categoryId);
        if (g.plantType) setPlantType(g.plantType);
        setIsInheritedFromGoal(true);
      }
    } else {
      setIsInheritedFromGoal(false);
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const catObj = categories.find(c => c.id === newCatId);
    if (catObj?.plantType) {
      setPlantType(catObj.plantType);
    }
  };

  const toggleDay = (dayIdx: number) => {
    if (targetDays.includes(dayIdx)) {
      if (targetDays.length === 1) return; // keep at least 1 day
      setTargetDays(targetDays.filter(d => d !== dayIdx));
    } else {
      setTargetDays([...targetDays, dayIdx].sort());
    }
  };

  const isActuallyDuplicate = isDuplicateMode || isDuplicate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('لطفاً عنوان عادت را وارد نمایید.');
      return;
    }

    // Check if linked goal is in past
    if (goalId) {
      const g = goals.find(item => item.id === goalId);
      if (g) {
        const gYear = g.year || today.year;
        if (isYearPast(gYear, today)) {
          setErrorMessage(`امکان اتصال به هدف سال گذشته (${toPersianDigits(gYear)}) وجود ندارد.`);
          return;
        }
        if (g.period === 'SEASONAL' && g.seasonIndex !== undefined && isSeasonPast(gYear, g.seasonIndex, today)) {
          setErrorMessage('امکان اتصال به هدف فصل تمام‌شده وجود ندارد.');
          return;
        }
        if (g.period === 'MONTHLY' && g.monthIndex !== undefined && isMonthPast(gYear, g.monthIndex, today)) {
          setErrorMessage('امکان اتصال به هدف ماه تمام‌شده وجود ندارد.');
          return;
        }
      }
    }

    setErrorMessage('');

    let habitId: string;
    if (isActuallyDuplicate) {
      habitId = `habit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    } else if (habit) {
      habitId = habit.id;
    } else {
      habitId = `habit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const newHabit: Habit = {
      id: habitId,
      title: title.trim(),
      notes: notes.trim(),
      categoryId: categoryId || categories[0]?.id || 'cat-health',
      goalId: goalId || null,
      time: habit?.time || '08:00',
      timerMinutes,
      frequency: targetDays.length === 7 ? 'DAILY' : 'WEEKLY',
      targetDaysOfWeek: targetDays,
      exemptHolidays,
      exemptWeekends,
      plantType,
      completionHistory: isActuallyDuplicate ? {} : (habit?.completionHistory || {}),
      createdAt: isActuallyDuplicate ? jalaliToFormattedString(today) : (habit ? habit.createdAt : jalaliToFormattedString(today)),
      isClosed: isActuallyDuplicate ? false : isClosed,
      closedAt: isActuallyDuplicate ? null : (isClosed ? (habit?.closedAt || jalaliToFormattedString(today)) : null),
    };

    onSave(newHabit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-emerald-100 flex flex-col max-h-[94vh] max-h-[94dvh] overflow-hidden my-auto animate-scale-up relative shrink-0">
        {/* Sticky Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isActuallyDuplicate ? 'bg-emerald-100 text-emerald-800' : isEdit ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {isActuallyDuplicate ? <Copy className="w-5 h-5" /> : isEdit ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                {isActuallyDuplicate ? 'ایجاد کپی جدید از عادت' : isEdit ? 'ویرایش اطلاعات عادت' : 'تعریف عادت جدید'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isActuallyDuplicate
                  ? 'یک عادت جدید مستقل با مشخصات همین عادت ایجاد می‌شود'
                  : isEdit 
                  ? `ویرایش تناوب، هدف متصل و زمانبندی «${title || habit?.title || ''}»`
                  : 'تعیین عنوان، تناوب تکرار و زمان تمرکز'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && !isActuallyDuplicate && (
              <button
                type="button"
                onClick={handleDuplicateCurrentHabit}
                className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                title="ایجاد کپی جدید از این عادت"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">کپی از عادت</span>
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

        {/* Scrollable Form Body */}
        <form id="habit-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 text-xs">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              عنوان عادت *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="مثلاً: مطالعه کتاب روزانه یا نرمش صبحگاهی"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all text-xs font-semibold text-gray-900"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              توضیحات و انگیزه
            </label>
            <textarea
              rows={2}
              placeholder="دلیل، روش انجام یا انگیزه این عادت..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all text-xs"
            />
          </div>

          {/* Category & Goal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-emerald-600" />
                  <span>دسته‌بندی</span>
                </span>
                {isInheritedFromGoal && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                    ارث‌بری از هدف
                  </span>
                )}
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-emerald-500 outline-hidden font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-800 mb-1 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>متصل به هدف</span>
              </label>
              <select
                value={goalId || ''}
                onChange={(e) => handleGoalChange(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-emerald-500 outline-hidden font-medium"
              >
                <option value="">بدون هدف (مستقل)</option>
                
                {/* 🎯 اهداف سالانه */}
                {goals.filter(g => g.period === 'ANNUAL').length > 0 && (
                  <optgroup label="🎯 اهداف سالانه (جاری در تمام فصول سال)">
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

                {/* 🌱 اهداف فصلی با آیکون و نام فصل */}
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

              {/* Goal connection note */}
              {goalId && (() => {
                const sel = goals.find(g => g.id === goalId);
                if (!sel) return null;
                if (sel.period === 'ANNUAL') {
                  return (
                    <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-[11px]">اتصال به هدف سالانه: جریان در تمام فصول سال</p>
                        <p className="text-[10px] text-emerald-800 leading-relaxed">
                          این عادت به صورت خودکار به تمام اهداف فصلی این هدف سالانه متصل می‌شود، مگر اینکه بعداً عادت را ببندید.
                        </p>
                      </div>
                    </div>
                  );
                }
                if (sel.period === 'SEASONAL') {
                  const sIdx = sel.seasonIndex ?? 0;
                  const sIcons = ['🌸', '☀️', '🍂', '❄️'];
                  const sNames = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
                  return (
                    <div className="mt-1.5 p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-center gap-1.5">
                      <span className="text-sm">{sIcons[sIdx]}</span>
                      <span className="font-bold">
                        متصل به هدف فصل {sNames[sIdx]} {toPersianDigits(sel.year)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Close habit toggle if editing */}
          {isEdit && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-gray-600" />
                  <span>بستن و خاتمه این عادت</span>
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  عادت از لیست فعال بسته می‌شود ولی تاریخچه و سوابق آن حفظ می‌ماند.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosed(!isClosed)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  isClosed
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {isClosed ? 'عادت بسته‌شده است (خاتمه یافته)' : 'عادت فعال است'}
              </button>
            </div>
          )}

          {/* Frequency & Days of week */}
          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-800 text-xs">تناوب تکرار عادت</label>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetDays([0, 1, 2, 3, 4, 5, 6])}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    targetDays.length === 7
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  روزانه (هر روز)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (targetDays.length === 7) {
                      setTargetDays([0, 2, 4]); // Sat, Mon, Wed
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    targetDays.length < 7
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  روزهای مشخص هفته
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {WEEKDAYS_SHORT.map((wName, idx) => {
                const isSelected = targetDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {wName}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500">
              {targetDays.length === 7 ? '✓ این عادت هر روز هفته باید انجام شود.' : `✓ این عادت در ${targetDays.length} روز مشخص از هفته تکرار می‌شود.`}
            </p>
          </div>

          {/* Plant Symbol & Focus Timer */}
          <div>
            <label className="block font-bold text-gray-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                <span>انتخاب گیاه نمادین</span>
              </span>
              <span className="text-[11px] font-normal text-emerald-700">با انجام مرتب رشد می‌کند</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1.5 bg-emerald-50/30 rounded-xl border border-emerald-100">
              {ALL_PLANT_TYPES.map((p) => {
                const isSelected = plantType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlantType(p.id)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200'
                        : 'bg-white text-gray-700 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <PlantIcon type={p.id} size="md" />
                    <span className="text-[10px] font-bold truncate w-full">{p.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>مدت زمان تمرکز روزانه (دقیقه - اختیاری)</span>
            </label>
            <input
              type="number"
              min="0"
              max="120"
              step="5"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-medium"
              placeholder="مثلاً ۱۵ یا ۲۵ دقیقه"
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
            form="habit-form"
            className={`px-5 py-2 rounded-xl text-white font-bold text-xs transition-all shadow-xs cursor-pointer ${
              isEdit
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isEdit ? 'ذخیره تغییرات عادت' : 'ایجاد و ثبت عادت جدید'}
          </button>
        </div>
      </div>
    </div>
  );
};
