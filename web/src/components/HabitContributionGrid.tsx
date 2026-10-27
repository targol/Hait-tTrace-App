import React from 'react';
import { Habit } from '../types';
import { getTodayJalali, addDaysJalali, jalaliToFormattedString, toPersianDigits, WEEKDAYS_SHORT, isDateHoliday } from '../calendar/jalali';
import { Flame, Check } from 'lucide-react';

interface Props {
  habit: Habit;
  onToggleDate: (dateStr: string) => void;
}

export const HabitContributionGrid: React.FC<Props> = ({ habit, onToggleDate }) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);

  // Generate the last 28 days (4 weeks x 7 days)
  const days: { dateStr: string; dayNumber: number; isCompleted: boolean; isToday: boolean; isHoliday: boolean; holidayTitle?: string }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDaysJalali(today, -i);
    const dateStr = jalaliToFormattedString(d);
    const hol = isDateHoliday(d);
    days.push({
      dateStr,
      dayNumber: d.day,
      isCompleted: !!habit.completionHistory[dateStr],
      isToday: dateStr === todayStr,
      isHoliday: hol.isHoliday,
      holidayTitle: hol.title,
    });
  }

  // Calculate current streak
  let currentStreak = 0;
  for (let i = 0; i < 28; i++) {
    const d = addDaysJalali(today, -i);
    const dateStr = jalaliToFormattedString(d);
    if (habit.completionHistory[dateStr]) {
      currentStreak++;
    } else {
      // If today is not completed yet, don't break streak immediately if yesterday was completed
      if (i === 0) {
        continue;
      }
      break;
    }
  }

  const completedIn28Days = days.filter(d => d.isCompleted).length;
  const adherenceRate = Math.round((completedIn28Days / 28) * 100);

  return (
    <div id={`habit-grid-${habit.id}`} className="mt-3 bg-white/70 rounded-xl p-3.5 border border-emerald-100/80">
      <div className="flex items-center justify-between text-xs mb-2.5">
        <div className="flex items-center gap-1.5 font-medium text-emerald-900">
          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>زنجیره پیوستگی: <strong className="text-emerald-700 font-bold">{toPersianDigits(currentStreak)} روز متوالی</strong></span>
        </div>
        <div className="text-emerald-700/80">
          پایبندی: <span className="font-semibold text-emerald-800">{toPersianDigits(adherenceRate)}٪</span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-gray-400 font-medium mb-1">
        {WEEKDAYS_SHORT.map((wd, idx) => (
          <div key={idx}>{wd}</div>
        ))}
      </div>

      {/* 28 cells in 4 rows of 7 */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => onToggleDate(d.dateStr)}
              title={`${d.dateStr}${d.isHoliday ? ` (تعطیل رسمی: ${d.holidayTitle})` : ''} - ${d.isCompleted ? 'انجام شده (برای لغو کلیک کنید)' : 'انجام نشده (برای ثبت کلیک کنید)'}`}
              className={`h-7 rounded-lg flex items-center justify-center text-[11px] font-medium transition-all duration-200 cursor-pointer select-none relative ${
                d.isCompleted
                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                  : d.isHoliday
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold'
                  : 'bg-emerald-50/70 text-emerald-900/60 hover:bg-emerald-100/80 border border-emerald-200/40'
              } ${d.isToday ? 'ring-2 ring-emerald-400 ring-offset-1 font-bold' : ''}`}
            >
              {d.isCompleted ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <span className={d.isHoliday ? 'text-rose-700 font-bold' : ''}>{toPersianDigits(d.dayNumber)}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2 px-0.5">
        <span>۲۸ روز گذشته</span>
        <span className="text-emerald-600">برای تغییر وضعیت هر روز، روی آن بزنید</span>
      </div>
    </div>
  );
};
