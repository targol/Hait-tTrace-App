import React from 'react';
import { Goal, AppTask, Habit } from '../types';
import { PlantIcon } from './PlantIcon';
import { toPersianDigits } from '../calendar/jalali';
import { calculateSeasonGardenSummary, SEASON_META } from '../utils/gardenCalculations';
import { Sprout, Sun, Target, CheckSquare, Droplets } from 'lucide-react';

interface Props {
  seasonIndex: number;
  year: number;
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  className?: string;
  compact?: boolean;
}

export const SeasonGardenCard: React.FC<Props> = ({
  seasonIndex,
  year,
  goals,
  tasks,
  habits,
  className = '',
  compact = false,
}) => {
  const meta = SEASON_META[seasonIndex] || SEASON_META[0];
  const summary = React.useMemo(() => {
    return calculateSeasonGardenSummary(seasonIndex, year, goals, tasks, habits);
  }, [seasonIndex, year, goals, tasks, habits]);

  if (compact) {
    return (
      <div className={`bg-white/90 border ${meta.borderClass} rounded-xl p-3 shadow-2xs space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlantIcon type={summary.focalPlant} size="xs" />
            <div>
              <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1">
                <span>{summary.icon}</span>
                <span>باغچه {summary.seasonName}</span>
              </span>
              <span className="text-[10px] text-gray-500 block leading-tight">
                {summary.botanicalStageTitle}
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-700">
            {toPersianDigits(summary.overallProgressPercent)}٪
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
            style={{ width: `${summary.overallProgressPercent}%` }}
          />
        </div>

        {/* Minimalist summary counts */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
          <span>{toPersianDigits(summary.completedGoalsCount)}/{toPersianDigits(summary.goalsCount)} هدف</span>
          <span>{toPersianDigits(summary.completedTasksCount)}/{toPersianDigits(summary.tasksCount)} تسک</span>
          <span>{toPersianDigits(summary.habitWateringDaysCount)} بار آبیاری</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${meta.bgGradient} border ${meta.borderClass} rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{summary.icon}</span>
          <div>
            <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
              <span>باغچه و خلاصه {summary.seasonName}</span>
              <span className="text-[10px] font-normal text-gray-500">
                ({summary.monthsText})
              </span>
            </h4>
            <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
              <Sprout className="w-3 h-3 text-emerald-600" />
              <span>{summary.botanicalStageTitle}</span>
            </span>
          </div>
        </div>

        <div className="text-left">
          <span className="text-[10px] text-gray-500 block">رشد فصل</span>
          <span className="text-sm font-black text-emerald-700">
            {toPersianDigits(summary.overallProgressPercent)}٪
          </span>
        </div>
      </div>

      {/* Center Plant & Progress */}
      <div className="flex items-center gap-3 bg-white/80 rounded-xl p-2.5 border border-white/60">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
          <PlantIcon type={summary.focalPlant} size="sm" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-600 font-medium hidden sm:inline">گیاه نمادین: <strong>{summary.focalPlant}</strong></span>
            <span className="text-gray-600 font-medium sm:hidden">پیشرفت فصل:</span>
            <span className="text-emerald-700 font-extrabold">{toPersianDigits(summary.overallProgressPercent)}٪</span>
          </div>

          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${summary.overallProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
        <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-100/80">
          <span className="text-[10px] text-gray-500 block">اهداف</span>
          <strong className="text-gray-900 font-extrabold text-[11px]">
            {toPersianDigits(summary.completedGoalsCount)} از {toPersianDigits(summary.goalsCount)}
          </strong>
        </div>

        <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-100/80">
          <span className="text-[10px] text-gray-500 block">تسک‌ها</span>
          <strong className="text-gray-900 font-extrabold text-[11px]">
            {toPersianDigits(summary.completedTasksCount)} از {toPersianDigits(summary.tasksCount)}
          </strong>
        </div>

        <div className="bg-white/80 rounded-lg p-1.5 border border-emerald-100/80">
          <span className="text-[10px] text-gray-500 block">آبیاری عادات</span>
          <strong className="text-gray-900 font-extrabold text-[11px]">
            {toPersianDigits(summary.habitWateringDaysCount)} بار
          </strong>
        </div>
      </div>

      {/* Weather Tagline */}
      <div className="flex items-center justify-between text-[10px] text-gray-600 pt-0.5 border-t border-black/5">
        <span className="flex items-center gap-1 text-emerald-800 truncate">
          <Sun className="w-3 h-3 text-amber-500 shrink-0" />
          <span>{summary.weatherStatus}</span>
        </span>
      </div>
    </div>
  );
};
