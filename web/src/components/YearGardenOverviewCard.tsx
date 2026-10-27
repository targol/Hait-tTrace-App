import React, { useState } from 'react';
import { Goal, AppTask, Habit } from '../types';
import { PlantIcon } from './PlantIcon';
import { toPersianDigits } from '../calendar/jalali';
import { calculateYearGardenSummary } from '../utils/gardenCalculations';
import { Sprout, Sun, ChevronDown, ChevronUp, Leaf, Target, CheckSquare, Droplets } from 'lucide-react';

interface Props {
  year: number;
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  className?: string;
  defaultExpanded?: boolean;
}

export const YearGardenOverviewCard: React.FC<Props> = ({
  year,
  goals,
  tasks,
  habits,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const summary = React.useMemo(() => {
    return calculateYearGardenSummary(year, goals, tasks, habits);
  }, [year, goals, tasks, habits]);

  return (
    <div className={`bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 rounded-2xl border border-emerald-200/90 shadow-2xs overflow-hidden transition-all ${className}`}>
      {/* Clickable Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-800 flex items-center justify-center shrink-0">
            <PlantIcon type={summary.focalPlant} size="xs" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-gray-950 truncate">
                باغچه سالانه {toPersianDigits(year)}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 shrink-0">
                یک سال کامل
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {summary.botanicalStageTitle} • <span className="font-bold text-emerald-700">{toPersianDigits(summary.overallProgressPercent)}٪ شکوفایی</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-left hidden sm:block">
            <span className="text-[10px] text-gray-500 block">پیشرفت سال</span>
            <span className="text-sm font-black text-emerald-700">
              {toPersianDigits(summary.overallProgressPercent)}٪
            </span>
          </div>

          <div className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3.5 pb-4 sm:px-4 sm:pb-4 pt-1 space-y-3.5 border-t border-emerald-100/70">
          {/* Main Year Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">روند پرورش و باروری درختان سالانه:</span>
              <span className="text-emerald-700 font-extrabold">{toPersianDigits(summary.overallProgressPercent)}٪</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${summary.overallProgressPercent}%` }}
              />
            </div>
          </div>

          {/* 4 Seasons Miniature Cards Grid */}
          <div>
            <span className="text-[11px] font-bold text-gray-700 block mb-2">
              خلاصه باغچه در چهار فصل سال {toPersianDigits(year)}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {summary.seasons.map((s) => (
                <div
                  key={s.seasonIndex}
                  className="bg-white/90 border border-emerald-100 rounded-xl p-2.5 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <span>{s.icon}</span>
                      <span>{s.seasonName}</span>
                    </span>
                    <span className="text-xs font-black text-emerald-700">
                      {toPersianDigits(s.overallProgressPercent)}٪
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${s.overallProgressPercent}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-gray-500 space-y-0.5 pt-0.5">
                    <div className="flex justify-between">
                      <span>اهداف:</span>
                      <strong className="text-gray-800">{toPersianDigits(s.completedGoalsCount)}/{toPersianDigits(s.goalsCount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>تسک‌ها:</span>
                      <strong className="text-gray-800">{toPersianDigits(s.completedTasksCount)}/{toPersianDigits(s.tasksCount)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            <div className="bg-white/80 rounded-xl p-2 border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-gray-500 block">اهداف کل سال</span>
              <strong className="text-emerald-950 font-black text-xs mt-0.5 block">
                {toPersianDigits(summary.allGoalsCount)} هدف ({toPersianDigits(summary.completedAnnualGoalsCount)} سالانه کامل)
              </strong>
            </div>

            <div className="bg-white/80 rounded-xl p-2 border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-gray-500 block">کل تسک‌های ثمررسیده</span>
              <strong className="text-emerald-950 font-black text-xs mt-0.5 block">
                {toPersianDigits(summary.completedTasksCount)} از {toPersianDigits(summary.totalTasksCount)} تسک
              </strong>
            </div>

            <div className="bg-white/80 rounded-xl p-2 border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-gray-500 block">روزهای آبیاری عادات</span>
              <strong className="text-emerald-950 font-black text-xs mt-0.5 block">
                {toPersianDigits(summary.totalHabitWaterings)} بار ثبت
              </strong>
            </div>
          </div>

          {/* Weather and Annual Atmosphere */}
          <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-emerald-100/70">
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{summary.weatherStatus}</span>
            </span>
            <span className="text-gray-500 text-[10px]">
              نماد باروری: <strong>{summary.focalPlant}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
