import React from 'react';
import { Goal, AppTask, Habit } from '../types';
import { toPersianDigits } from '../calendar/jalali';
import { X, ArrowLeft, ArrowRight, CheckCircle2, Clock, Calendar, CheckSquare, Sparkles, Repeat } from 'lucide-react';
import { PlantIcon } from './PlantIcon';

interface Props {
  isOpen: boolean;
  fromGoal: Goal | null;
  targetSeasonIndex: number;
  tasks: AppTask[];
  habits: Habit[];
  onClose: () => void;
  onConfirm: (fromGoalId: string, targetSeasonIndex: number) => void;
}

const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

export const SeasonRolloverModal: React.FC<Props> = ({
  isOpen,
  fromGoal,
  targetSeasonIndex,
  tasks,
  habits,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !fromGoal) return null;

  const fromSeasonIdx = fromGoal.seasonIndex ?? 0;
  const fromSeasonName = SEASONS[fromSeasonIdx] || 'فصل قبل';
  const targetSeasonName = SEASONS[targetSeasonIndex] || 'فصل بعد';

  const pendingTasks = tasks.filter(t => t.goalId === fromGoal.id && !t.isCompleted);
  const linkedHabits = habits.filter(h => h.goalId === fromGoal.id);

  const handleConfirm = () => {
    onConfirm(fromGoal.id, targetSeasonIndex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">انتقال تسک‌ها و عادات به فصل بعد</h3>
              <p className="text-[11px] text-gray-500">انتقال موارد باقیمانده به هدف فصل جدید</p>
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
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* Season Flow Banner */}
          <div className="flex items-center justify-center gap-3 p-3.5 bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div className="text-center">
              <span className="text-[10px] text-gray-500 block">فصل مبدأ</span>
              <span className="font-bold text-emerald-900 text-xs">فصل {fromSeasonName}</span>
            </div>

            <div className="flex items-center text-emerald-600">
              <ArrowLeft className="w-5 h-5 animate-pulse" />
            </div>

            <div className="text-center">
              <span className="text-[10px] text-gray-500 block">فصل مقصد</span>
              <span className="font-bold text-teal-900 text-xs">فصل {targetSeasonName}</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed">
            با تایید شما، تمام تسک‌های انجام‌نشده و عادات فعال متصل به این هدف، به صورت خودکار به هدف فصل <strong className="text-emerald-800">{targetSeasonName}</strong> منتقل می‌شوند.
          </p>

          {/* Pending Tasks List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-800 text-xs">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>تسک‌های انجام‌نشده ({toPersianDigits(pendingTasks.length)})</span>
              </span>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 text-[11px] text-center border border-gray-100">
                همه تسک‌های این فصل تکمیل شده‌اند.
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
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

          {/* Linked Habits List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-gray-800 text-xs">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>عادات مرتبط برای انتقال ({toPersianDigits(linkedHabits.length)})</span>
              </span>
            </div>

            {linkedHabits.length === 0 ? (
              <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 text-[11px] text-center border border-gray-100">
                عادتی برای این هدف ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {linkedHabits.map((habit) => (
                  <div key={habit.id} className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                      <PlantIcon type={habit.plantType} size="xs" />
                      <span className="font-medium text-gray-900 truncate">{habit.title}</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {habit.frequency === 'DAILY' ? 'روزانه' : 'هفتگی'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تایید و انتقال خودکار به فصل {targetSeasonName}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
