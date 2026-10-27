import React, { useState, useEffect, useMemo } from 'react';
import { Goal, AppTask, Habit, Category } from '../types';
import { toPersianDigits, PERSIAN_MONTHS } from '../calendar/jalali';
import { 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  Repeat, 
  Plus, 
  Layers, 
  Target,
  Sparkles,
  AlertCircle,
  Archive,
  Calendar
} from 'lucide-react';
import { EntityIcon, EntityBadge } from './EntityIcon';

interface Props {
  isOpen: boolean;
  fromGoal: Goal | null;
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  categories: Category[];
  onClose: () => void;
  onConfirmTransfer: (
    fromGoalId: string,
    targetGoalId: string,
    options: {
      transferTasks: boolean;
      transferHabits: boolean;
    }
  ) => void;
  onCreateTargetAndTransfer: (
    fromGoal: Goal,
    targetTitle: string,
    targetPeriod: 'SEASONAL' | 'MONTHLY' | 'ANNUAL',
    targetSeasonIndex?: number,
    targetMonthIndex?: number,
    targetYear?: number
  ) => void;
  onClosePendingItems?: (fromGoalId: string) => void;
}

const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
const SEASON_ICONS = ['🌸', '☀️', '🍂', '❄️'];

export const TransferPeriodItemsModal: React.FC<Props> = ({
  isOpen,
  fromGoal,
  goals,
  tasks,
  habits,
  categories,
  onClose,
  onConfirmTransfer,
  onCreateTargetAndTransfer,
  onClosePendingItems,
}) => {
  const [targetTab, setTargetTab] = useState<'SEASONAL' | 'ANNUAL' | 'CLOSE'>('SEASONAL');
  const [selectedTargetGoalId, setSelectedTargetGoalId] = useState<string>('');
  const [transferTasks, setTransferTasks] = useState(true);
  const [transferHabits, setTransferHabits] = useState(true);
  const [customNewGoalTitle, setCustomNewGoalTitle] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Derive source period info
  const sourcePeriodInfo = useMemo(() => {
    if (!fromGoal) return { name: '', nextName: '', type: 'SEASONAL' as const, nextSeasonIdx: 0, nextMonthIdx: 1, nextYear: 1405 };

    if (fromGoal.period === 'SEASONAL') {
      const curSeason = fromGoal.seasonIndex ?? 0;
      const nextSeason = (curSeason + 1) % 4;
      const nextYear = curSeason === 3 ? fromGoal.year + 1 : fromGoal.year;
      return {
        name: `فصل ${SEASONS[curSeason]} ${toPersianDigits(fromGoal.year)}`,
        nextName: `فصل ${SEASONS[nextSeason]} ${toPersianDigits(nextYear)}`,
        type: 'SEASONAL' as const,
        nextSeasonIdx: nextSeason,
        nextMonthIdx: undefined,
        nextYear,
      };
    }

    if (fromGoal.period === 'MONTHLY') {
      const curMonth = fromGoal.monthIndex ?? 1;
      const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
      const nextYear = curMonth === 12 ? fromGoal.year + 1 : fromGoal.year;
      return {
        name: `ماه ${PERSIAN_MONTHS[(curMonth - 1 + 12) % 12]} ${toPersianDigits(fromGoal.year)}`,
        nextName: `ماه ${PERSIAN_MONTHS[(nextMonth - 1 + 12) % 12]} ${toPersianDigits(nextYear)}`,
        type: 'MONTHLY' as const,
        nextSeasonIdx: Math.floor((nextMonth - 1) / 3),
        nextMonthIdx: nextMonth,
        nextYear,
      };
    }

    // ANNUAL
    const nextYear = fromGoal.year + 1;
    return {
      name: `سال ${toPersianDigits(fromGoal.year)}`,
      nextName: `سال ${toPersianDigits(nextYear)}`,
      type: 'ANNUAL' as const,
      nextSeasonIdx: 0,
      nextMonthIdx: undefined,
      nextYear,
    };
  }, [fromGoal]);

  // Find candidate seasonal goals
  const seasonalCandidateGoals = useMemo(() => {
    if (!fromGoal) return [];
    return goals.filter(g => {
      if (g.id === fromGoal.id) return false;
      if (g.period !== 'SEASONAL') return false;

      const sameCategory = g.categoryId === fromGoal.categoryId;
      const sameParent = g.parentId === fromGoal.parentId;
      const matchesNextSeason = g.seasonIndex === sourcePeriodInfo.nextSeasonIdx;

      if (matchesNextSeason && (sameCategory || sameParent)) return true;
      if (sameCategory && g.status === 'IN_PROGRESS') return true;
      return false;
    });
  }, [fromGoal, goals, sourcePeriodInfo]);

  // Find candidate annual goals
  const annualCandidateGoals = useMemo(() => {
    if (!fromGoal) return [];
    return goals.filter(g => {
      if (g.id === fromGoal.id) return false;
      if (g.period !== 'ANNUAL') return false;

      // Parent annual goal always included
      if (fromGoal.parentId && g.id === fromGoal.parentId) return true;
      // Or annual goals in same category
      if (g.categoryId === fromGoal.categoryId) return true;
      return false;
    });
  }, [fromGoal, goals]);

  // Candidate goals based on active tab
  const candidateGoals = useMemo(() => {
    if (targetTab === 'SEASONAL') return seasonalCandidateGoals;
    if (targetTab === 'ANNUAL') return annualCandidateGoals;
    return [];
  }, [targetTab, seasonalCandidateGoals, annualCandidateGoals]);

  // Auto-select first goal or trigger new goal creation
  useEffect(() => {
    if (targetTab === 'CLOSE') {
      setSelectedTargetGoalId('');
      setIsCreatingNew(false);
      return;
    }

    if (candidateGoals.length === 1) {
      setSelectedTargetGoalId(candidateGoals[0].id);
      setIsCreatingNew(false);
    } else if (candidateGoals.length > 1) {
      if (!selectedTargetGoalId || !candidateGoals.some(g => g.id === selectedTargetGoalId)) {
        setSelectedTargetGoalId(candidateGoals[0].id);
      }
      setIsCreatingNew(false);
    } else {
      setSelectedTargetGoalId('');
      if (targetTab === 'SEASONAL') {
        setIsCreatingNew(true);
        setCustomNewGoalTitle(`ادامه ${fromGoal?.title || 'برنامه'} در ${sourcePeriodInfo.nextName}`);
      } else {
        setIsCreatingNew(false);
      }
    }
  }, [candidateGoals, targetTab, fromGoal, sourcePeriodInfo]);

  if (!isOpen || !fromGoal) return null;

  const pendingTasks = tasks.filter(t => t.goalId === fromGoal.id && !t.isCompleted);
  const linkedHabits = habits.filter(h => h.goalId === fromGoal.id);
  const category = categories.find(c => c.id === fromGoal.categoryId);

  const handleConfirm = () => {
    if (targetTab === 'CLOSE') {
      onClosePendingItems?.(fromGoal.id);
      onClose();
      return;
    }

    if (isCreatingNew) {
      onCreateTargetAndTransfer(
        fromGoal,
        customNewGoalTitle.trim() || `ادامه ${fromGoal.title} (${sourcePeriodInfo.nextName})`,
        sourcePeriodInfo.type,
        sourcePeriodInfo.nextSeasonIdx,
        sourcePeriodInfo.nextMonthIdx,
        sourcePeriodInfo.nextYear
      );
      onClose();
      return;
    }

    if (selectedTargetGoalId) {
      onConfirmTransfer(fromGoal.id, selectedTargetGoalId, {
        transferTasks,
        transferHabits,
      });
      onClose();
    }
  };

  const selectedTargetGoal = goals.find(g => g.id === selectedTargetGoalId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                انتقال تسک‌ها و عادات به دوره بعدی
              </h3>
              <p className="text-[11px] text-gray-500">
                انتقال اقدامات باقیمانده به هدف دوره جدید با انتخاب هدف مقصد
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(92vh-130px)]">
          {/* Source -> Target Banner */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-gray-500 block">هدف مبدأ:</span>
              <span className="font-bold text-emerald-950 text-xs truncate block">
                {fromGoal.title}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">
                {sourcePeriodInfo.name}
              </span>
            </div>

            <div className="px-2 text-emerald-600">
              <ArrowLeft className="w-5 h-5 animate-pulse" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <span className="text-[10px] text-gray-500 block">دوره مقصد:</span>
              <span className="font-bold text-teal-950 text-xs block">
                {sourcePeriodInfo.nextName}
              </span>
              {category && (
                <span className="text-[10px] text-gray-500">
                  دسته: {category.title}
                </span>
              )}
            </div>
          </div>

          {/* Mode Tabs: Seasonal vs Annual vs Close */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl border border-gray-200/80">
            <button
              type="button"
              onClick={() => setTargetTab('SEASONAL')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetTab === 'SEASONAL'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>🌸</span>
              <span>انتقال به هدف فصلی</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetTab('ANNUAL')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetTab === 'ANNUAL'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>انتقال به هدف سالانه</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetTab('CLOSE')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetTab === 'CLOSE'
                  ? 'bg-amber-100/90 text-amber-900 shadow-xs border border-amber-300'
                  : 'text-gray-600 hover:text-amber-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-700" />
              <span>بستن و خاتمه</span>
            </button>
          </div>

          {/* Destination Goal Selection or Close Panel */}
          {targetTab === 'CLOSE' ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Archive className="w-4 h-4 text-amber-700" />
                <span>بستن تسک‌های دوره و پایان فصل</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                تسک‌های تکمیل‌نشده این فصل بسته می‌شوند و سوابق آن‌ها در تاریخچه همین هدف محفوظ می‌ماند. این تسک‌ها به فصل بعدی منتقل نخواهند شد.
              </p>
              <div className="text-[11px] font-semibold text-gray-700 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                تعداد تسک‌های آماده بستن: <span className="font-bold text-amber-900">{toPersianDigits(pendingTasks.length)} تسک</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50/90 rounded-xl p-3.5 border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {targetTab === 'SEASONAL' ? 'انتخاب هدف فصلی مقصد:' : 'انتخاب هدف سالانه مقصد:'}
                  </span>
                </label>

                {candidateGoals.length === 1 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    انتخاب خودکار (تنها یک هدف متناظر)
                  </span>
                )}
              </div>

              {candidateGoals.length > 0 && !isCreatingNew ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {candidateGoals.map((cg) => {
                      const isSelected = selectedTargetGoalId === cg.id;
                      const cgCat = categories.find(c => c.id === cg.categoryId);
                      const isParent = fromGoal.parentId === cg.id;
                      const seasonIdx = cg.seasonIndex ?? 0;

                      return (
                        <div
                          key={cg.id}
                          onClick={() => setSelectedTargetGoalId(cg.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            {cg.period === 'SEASONAL' ? (
                              <span className="text-base shrink-0">{SEASON_ICONS[seasonIdx] || '🌱'}</span>
                            ) : (
                              <EntityIcon type="ANNUAL_GOAL" size="xs" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 text-xs truncate">
                                  {cg.title}
                                </span>
                                {isParent && (
                                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                    هدف سالانه مادر
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                                {cg.period === 'SEASONAL' && cg.seasonIndex !== undefined && (
                                  <span>فصل {SEASONS[cg.seasonIndex]} ({toPersianDigits(cg.year)})</span>
                                )}
                                {cg.period === 'ANNUAL' && (
                                  <span>سال {toPersianDigits(cg.year)}</span>
                                )}
                                {cgCat && (
                                  <span className="text-gray-400">• {cgCat.title}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <input
                            type="radio"
                            name="targetGoal"
                            checked={isSelected}
                            onChange={() => setSelectedTargetGoalId(cg.id)}
                            className="w-4 h-4 text-emerald-600 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {targetTab === 'SEASONAL' && (
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">یا مایلید برای فصل بعد هدف بسازید؟</span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNew(true)}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>ایجاد هدف جدید برای فصل بعد</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      هدفی برای این دسته در {targetTab === 'SEASONAL' ? sourcePeriodInfo.nextName : 'اهداف سالانه'} یافت نشد. می‌توانید با عنوان زیر هدف جدید ایجاد کنید تا تسک‌ها و عادات به آن منتقل شوند:
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      عنوان هدف جدید:
                    </label>
                    <input
                      type="text"
                      value={customNewGoalTitle}
                      onChange={(e) => setCustomNewGoalTitle(e.target.value)}
                      placeholder={`مثلاً: ادامه ${fromGoal.title} در فصل بعدی`}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
                    />
                  </div>

                  {candidateGoals.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="text-[11px] text-gray-600 hover:text-gray-900 hover:underline cursor-pointer"
                    >
                      بازگشت به انتخاب از اهداف موجود
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending Tasks & Habits Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-800 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transferTasks}
                  onChange={(e) => setTransferTasks(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <EntityIcon type="TASK" size="xs" showBackground={false} />
                <span>انتقال تسک‌های انجام‌نشده ({toPersianDigits(pendingTasks.length)})</span>
              </label>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 text-[11px] text-center border border-gray-100">
                همه تسک‌های این هدف تکمیل شده‌اند.
              </div>
            ) : (
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-2 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-between">
                    <span className="font-medium text-gray-900 truncate max-w-[280px]">{task.title}</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      انجام‌نشده
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-800 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transferHabits}
                  onChange={(e) => setTransferHabits(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <EntityIcon type="HABIT" size="xs" showBackground={false} />
                <span>انتقال عادات فعال متصل ({toPersianDigits(linkedHabits.length)})</span>
              </label>
            </div>

            {linkedHabits.length === 0 ? (
              <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 text-[11px] text-center border border-gray-100">
                عادتی متصل به این هدف ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {linkedHabits.map((habit) => (
                  <div key={habit.id} className="p-2 rounded-lg bg-amber-50/40 border border-amber-100 flex items-center justify-between">
                    <span className="font-medium text-gray-900 truncate max-w-[280px]">{habit.title}</span>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {habit.frequency === 'DAILY' ? 'روزانه' : 'هفتگی'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={targetTab !== 'CLOSE' && !isCreatingNew && !selectedTargetGoalId}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              targetTab === 'CLOSE'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {targetTab === 'CLOSE' ? (
              <>
                <Archive className="w-4 h-4" />
                <span>بستن و خاتمه تسک‌های این دوره ({toPersianDigits(pendingTasks.length)})</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isCreatingNew 
                    ? `ایجاد هدف و انتقال به ${sourcePeriodInfo.nextName}` 
                    : `تایید و انتقال به «${selectedTargetGoal?.title || 'هدف انتخابی'}»`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
