import React, { useState, useMemo } from 'react';
import { AppTask, Goal, Category } from '../types';
import { toPersianDigits, getTodayJalali, PERSIAN_SEASONS, getSeasonByMonth } from '../calendar/jalali';
import { 
  X, 
  Target, 
  Repeat, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  ArrowLeft, 
  Sparkles,
  Archive,
  Layers,
  Folder
} from 'lucide-react';
import { SeasonBadge } from './SeasonBadge';
import { EntityIcon, EntityBadge } from './EntityIcon';

interface Props {
  isOpen: boolean;
  task: AppTask | null;
  goals: Goal[];
  categories: Category[];
  onClose: () => void;
  onTransfer: (taskId: string, targetGoalId: string | null, closeTask: boolean, noteAppend?: string) => void;
  onCreateSeasonalGoalAndTransfer?: (
    taskId: string, 
    seasonIdx: number, 
    year: number, 
    title: string,
    parentAnnualId?: string | null, 
    categoryId?: string,
    continuesGoalId?: string | null
  ) => void;
}

export const TransferTaskModal: React.FC<Props> = ({
  isOpen,
  task,
  goals,
  categories,
  onClose,
  onTransfer,
  onCreateSeasonalGoalAndTransfer,
}) => {
  const today = getTodayJalali();
  const currentSeasonIdx = getSeasonByMonth(today.month);

  const [activeTab, setActiveTab] = useState<'SEASONAL' | 'ANNUAL' | 'CLOSE'>('SEASONAL');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>((currentSeasonIdx + 1) % 4);
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [isCreatingNewSeasonal, setIsCreatingNewSeasonal] = useState<boolean>(false);

  // Find current goal of task
  const currentGoal = useMemo(() => {
    if (!task?.goalId) return null;
    return goals.find(g => g.id === task.goalId) || null;
  }, [task, goals]);

  // Current category
  const taskCategory = useMemo(() => {
    return categories.find(c => c.id === task?.categoryId) || null;
  }, [task, categories]);

  // Annual goals
  const annualGoals = useMemo(() => {
    return goals.filter(g => g.period === 'ANNUAL');
  }, [goals]);

  // Seasonal goals grouped by season index
  const seasonalGoals = useMemo(() => {
    return goals.filter(g => g.period === 'SEASONAL');
  }, [goals]);

  // Next season calculation based on current goal or today's season
  const nextSeasonIdx = useMemo(() => {
    if (currentGoal?.period === 'SEASONAL' && currentGoal.seasonIndex !== undefined) {
      return (currentGoal.seasonIndex + 1) % 4;
    }
    return (currentSeasonIdx + 1) % 4;
  }, [currentGoal, currentSeasonIdx]);

  const nextSeasonYear = useMemo(() => {
    const curYear = currentGoal?.year || today.year;
    if (currentGoal?.period === 'SEASONAL' && currentGoal.seasonIndex === 3) {
      return curYear + 1;
    }
    return curYear;
  }, [currentGoal, today.year]);

  if (!isOpen || !task) return null;

  const handleConfirm = () => {
    if (activeTab === 'CLOSE') {
      onTransfer(task.id, task.goalId || null, true, '[پایان دوره و بستن تسک]');
      onClose();
      return;
    }

    if (activeTab === 'SEASONAL') {
      if (isCreatingNewSeasonal) {
        const title = newGoalTitle.trim() || `هدف فصل ${PERSIAN_SEASONS[selectedSeasonIdx].name} (ادامه اقدامات)`;
        const parentAnnual = currentGoal?.period === 'ANNUAL' 
          ? currentGoal.id 
          : (currentGoal?.parentId || annualGoals[0]?.id || null);

        if (onCreateSeasonalGoalAndTransfer) {
          onCreateSeasonalGoalAndTransfer(
            task.id,
            selectedSeasonIdx,
            nextSeasonYear,
            title,
            parentAnnual,
            task.categoryId || categories[0]?.id,
            currentGoal?.period === 'SEASONAL' ? currentGoal.id : null
          );
        }
        onClose();
        return;
      }

      if (selectedGoalId) {
        const target = goals.find(g => g.id === selectedGoalId);
        const append = target ? `[انتقال به هدف فصلی «${target.title}»]` : '';
        onTransfer(task.id, selectedGoalId, false, append);
        onClose();
        return;
      }
    }

    if (activeTab === 'ANNUAL') {
      if (selectedGoalId) {
        const target = goals.find(g => g.id === selectedGoalId);
        const append = target ? `[انتقال به هدف سالانه «${target.title}»]` : '';
        onTransfer(task.id, selectedGoalId, false, append);
        onClose();
        return;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                انتقال یا بستن تسک
              </h3>
              <p className="text-[11px] text-gray-500">
                تعیین مقصد جدید (هدف سالانه یا فصلی) یا بستن تسک با پایان فصل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Current Task Info Card */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-medium">تسک انتخابی:</span>
              {taskCategory && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  {taskCategory.title}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-gray-900 leading-snug">
              {task.title}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-600">
              <span className="text-gray-400">هدف فعلی:</span>
              {currentGoal ? (
                <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                  {currentGoal.period === 'SEASONAL' && (
                    <SeasonBadge seasonIndex={currentGoal.seasonIndex} size="xs" />
                  )}
                  {currentGoal.period === 'ANNUAL' && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">🎯 سالانه</span>
                  )}
                  <span className="truncate max-w-[200px]">{currentGoal.title}</span>
                </div>
              ) : (
                <span className="text-gray-400 font-medium">بدون هدف متصل (مستقل)</span>
              )}
            </div>
          </div>

          {/* Navigation Tabs for Target Choice */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              اقدام مورد نظر را انتخاب کنید:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('SEASONAL');
                  setIsCreatingNewSeasonal(false);
                  setSelectedGoalId('');
                }}
                className={`py-2 px-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'SEASONAL'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>🌱</span>
                  <span>هدف فصلی</span>
                </div>
                <span className="text-[9px] font-normal opacity-80">(فصل بعد یا سایر)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('ANNUAL');
                  setIsCreatingNewSeasonal(false);
                  setSelectedGoalId('');
                }}
                className={`py-2 px-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'ANNUAL'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>🎯</span>
                  <span>هدف سالانه</span>
                </div>
                <span className="text-[9px] font-normal opacity-80">(انتقال مستقیم)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('CLOSE');
                  setIsCreatingNewSeasonal(false);
                  setSelectedGoalId('');
                }}
                className={`py-2 px-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeTab === 'CLOSE'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>بستن تسک</span>
                </div>
                <span className="text-[9px] font-normal opacity-80">(اتمام در این فصل)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SEASONAL GOALS */}
          {activeTab === 'SEASONAL' && (
            <div className="space-y-3">
              {/* Quick suggestion banner for next season */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{PERSIAN_SEASONS[nextSeasonIdx].iconName === 'Sprout' ? '🌸' : PERSIAN_SEASONS[nextSeasonIdx].iconName === 'Sun' ? '☀️' : PERSIAN_SEASONS[nextSeasonIdx].iconName === 'Flame' ? '🍂' : '❄️'}</span>
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      انتقال پیشنهادی به فصل {PERSIAN_SEASONS[nextSeasonIdx].name} ({toPersianDigits(nextSeasonYear)}):
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      پایان دوره کنونی و پیگیری اقدامات در فصل آینده
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeasonIdx(nextSeasonIdx);
                    setIsCreatingNewSeasonal(true);
                    setNewGoalTitle(`ادامه ${currentGoal?.title || task.title} در فصل ${PERSIAN_SEASONS[nextSeasonIdx].name}`);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>ایجاد هدف جدید</span>
                </button>
              </div>

              {/* Mode switch: choose existing vs create new */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-gray-700">انتخاب از اهداف فصلی موجود:</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewSeasonal(!isCreatingNewSeasonal)}
                  className="text-emerald-700 font-semibold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCreatingNewSeasonal ? 'انتخاب از لیست اهداف' : 'تعریف هدف فصلی تازه'}</span>
                </button>
              </div>

              {isCreatingNewSeasonal ? (
                <div className="bg-emerald-50/40 border border-emerald-300 rounded-xl p-3.5 space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      عنوان هدف فصلی جدید:
                    </label>
                    <input
                      type="text"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      placeholder={`مثال: ادامه پیگیری در فصل ${PERSIAN_SEASONS[selectedSeasonIdx].name}`}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:border-emerald-500 outline-hidden font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      فصل مورد نظر:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PERSIAN_SEASONS.map((s) => (
                        <button
                          key={s.index}
                          type="button"
                          onClick={() => setSelectedSeasonIdx(s.index)}
                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            selectedSeasonIdx === s.index
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 text-xs'
                          }`}
                        >
                          <span className="block text-sm mb-0.5">
                            {s.index === 0 ? '🌸' : s.index === 1 ? '☀️' : s.index === 2 ? '🍂' : '❄️'}
                          </span>
                          <span className="text-[10px] font-bold">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {seasonalGoals.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
                      هیچ هدف فصلی تعریف نشده است. با دکمه بالا یک هدف فصلی بسازید.
                    </div>
                  ) : (
                    seasonalGoals.map((sg) => {
                      const isSelected = selectedGoalId === sg.id;
                      const sIdx = sg.seasonIndex ?? 0;
                      const parent = sg.parentId ? goals.find(p => p.id === sg.parentId) : undefined;

                      return (
                        <div
                          key={sg.id}
                          onClick={() => setSelectedGoalId(sg.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <SeasonBadge seasonIndex={sIdx} size="sm" />
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 text-xs truncate block">
                                {sg.title}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                                <span>سال {toPersianDigits(sg.year)}</span>
                                {parent && <span>• ذیل {parent.title}</span>}
                              </div>
                            </div>
                          </div>

                          <input
                            type="radio"
                            name="seasonalSelect"
                            checked={isSelected}
                            onChange={() => setSelectedGoalId(sg.id)}
                            className="w-4 h-4 text-emerald-600 cursor-pointer"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANNUAL GOALS */}
          {activeTab === 'ANNUAL' && (
            <div className="space-y-2">
              <span className="font-bold text-gray-700 text-xs block">
                انتقال مستقیم تسک به هدف کلان سالانه:
              </span>
              <p className="text-[11px] text-gray-500">
                این تسک به طور مستقیم زیرمجموعه هدف سالانه خواهد شد و در ارزیابی کلی سال لحاظ می‌گردد.
              </p>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 pt-1">
                {annualGoals.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
                    هیچ هدف سالانه‌ای تعریف نشده است.
                  </div>
                ) : (
                  annualGoals.map((ag) => {
                    const isSelected = selectedGoalId === ag.id;
                    const cat = categories.find(c => c.id === ag.categoryId);

                    return (
                      <div
                        key={ag.id}
                        onClick={() => setSelectedGoalId(ag.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-base shrink-0">🎯</span>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 text-xs truncate block">
                              {ag.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                              <span>سال {toPersianDigits(ag.year)}</span>
                              {cat && <span>• {cat.title}</span>}
                            </div>
                          </div>
                        </div>

                        <input
                          type="radio"
                          name="annualSelect"
                          checked={isSelected}
                          onChange={() => setSelectedGoalId(ag.id)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLOSE TASK */}
          {activeTab === 'CLOSE' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>بستن تسک با پایان فصل جاری</span>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                این تسک به عنوان انجام‌شده / خاتمه‌یافته علامت‌گذاری می‌شود و در آمار و تاریخچه فصل ثبت می‌گردد. تسک به فصل بعدی منتقل نخواهد شد.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={activeTab !== 'CLOSE' && !selectedGoalId && !isCreatingNewSeasonal}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {activeTab === 'CLOSE' 
                ? 'تایید و بستن تسک' 
                : isCreatingNewSeasonal 
                ? 'ایجاد هدف و انتقال تسک' 
                : 'انتقال تسک'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
