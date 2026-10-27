import React, { useState, useMemo, useEffect } from 'react';
import { AppTask, Habit, Category, Goal } from '../types';
import { 
  getTodayJalali, 
  addDaysJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  WEEKDAYS,
  WEEKDAYS_SHORT,
  PERSIAN_MONTHS,
  isDateHoliday,
  getDayOfWeek,
} from '../calendar/jalali';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Flame, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Sparkles, 
  Layers, 
  BarChart2, 
  Check, 
  Clock,
  Activity,
  CalendarDays,
  ArrowRight,
  Info
} from 'lucide-react';

interface WeeklyProgressSummaryProps {
  tasks: AppTask[];
  habits: Habit[];
  categories?: Category[];
  goals?: Goal[];
  className?: string;
}

export interface DayProgressData {
  dayIndex: number; // 0 (Saturday) to 6 (Friday)
  dayKey: string;
  dayName: string;
  dayShortName: string;
  dateStr: string; // e.g. "1405/07/07"
  dayNumber: number;
  monthNumber: number;
  monthName: string;
  isToday: boolean;
  isHoliday: boolean;
  holidayTitle?: string;
  tasksDone: number;
  habitsDone: number;
  totalActivities: number;
  completedTasksList: AppTask[];
  completedHabitsList: Habit[];
  focusMinutes: number;
}

/**
 * Normalizes Jalali date string to standard "YYYY/MM/DD" with zero padding
 */
function normalizeDateStr(str?: string | null): string {
  if (!str) return '';
  const trimmed = str.trim().split(' ')[0].split('-')[0].trim();
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return trimmed;
}

/**
 * Check if a task is marked completed on a given target date
 */
function isTaskCompletedOnDate(task: AppTask, targetDateStr: string): boolean {
  if (!task.isCompleted) return false;
  const targetNorm = normalizeDateStr(targetDateStr);

  if (task.completedAt) {
    const compNorm = normalizeDateStr(task.completedAt);
    if (compNorm === targetNorm) return true;
  }

  // Fallback: if completedAt is missing but dueDate matches
  if (!task.completedAt && task.dueDate) {
    const dueNorm = normalizeDateStr(task.dueDate);
    if (dueNorm === targetNorm) return true;
  }

  return false;
}

/**
 * Check if a habit was completed on a given target date
 */
function isHabitCompletedOnDate(habit: Habit, targetDateStr: string): boolean {
  if (!habit.completionHistory) return false;

  const targetNorm = normalizeDateStr(targetDateStr);
  if (habit.completionHistory[targetNorm]) return true;
  if (habit.completionHistory[targetDateStr]) return true;

  // Also check without leading zero variants (e.g. 1405/7/8)
  const parts = targetNorm.split('/');
  if (parts.length === 3) {
    const unpadded = `${parts[0]}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    if (habit.completionHistory[unpadded]) return true;
  }

  return false;
}

// Standalone Custom X-Axis Tick Component to prevent Recharts 3 unmount jitter
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, dayMap, selectedDate } = props;
  if (!payload || !payload.value) return null;

  const item: DayProgressData | undefined = dayMap?.[payload.value];
  if (!item) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="middle" fill="#6B7280" fontSize={11}>
          {payload.value}
        </text>
      </g>
    );
  }

  const isToday = item.isToday;
  const isSelected = item.dateStr === selectedDate;
  const isHoliday = item.isHoliday;

  const textColor = isSelected 
    ? '#059669' 
    : isToday 
      ? '#10B981' 
      : isHoliday 
        ? '#E11D48' 
        : '#4B5563';

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Day Name */}
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill={textColor}
        fontSize={11}
        fontWeight={isToday || isSelected ? 800 : 600}
        fontFamily="Vazirmatn, sans-serif"
      >
        {item.dayShortName}
      </text>

      {/* Date Number */}
      <text
        x={0}
        y={0}
        dy={28}
        textAnchor="middle"
        fill={isSelected ? '#059669' : isToday ? '#10B981' : '#9CA3AF'}
        fontSize={10}
        fontWeight={isToday ? 700 : 400}
        fontFamily="monospace"
      >
        {toPersianDigits(item.dayNumber)}
      </text>

      {/* Green indicator dot for Today */}
      {isToday && (
        <circle cx={0} cy={34} r={2} fill="#10B981" />
      )}
    </g>
  );
};

export const WeeklyProgressSummary: React.FC<WeeklyProgressSummaryProps> = ({
  tasks,
  habits,
  categories = [],
  goals = [],
  className = '',
}) => {
  // Mounting guard for safe Recharts dimension calculation
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = useMemo(() => getTodayJalali(), []);
  const todayStr = useMemo(() => jalaliToFormattedString(today), [today]);

  // Week offset state (0 = current Persian week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Chart presentation mode: 'GROUPED' (side-by-side) or 'STACKED' (combined)
  const [chartMode, setChartMode] = useState<'GROUPED' | 'STACKED'>('GROUPED');

  // Selected day for detailed inspection (null = overview)
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Compute the anchor date for the viewed week
  const anchorDate = useMemo(() => {
    return addDaysJalali(today, weekOffset * 7);
  }, [today, weekOffset]);

  // Compute start of Persian week (Saturday = day 0)
  const weekDays = useMemo(() => {
    const currentDOW = getDayOfWeek(anchorDate); // 0 (شنبه) to 6 (جمعه)
    const saturday = addDaysJalali(anchorDate, -currentDOW);

    const days: DayProgressData[] = [];

    for (let i = 0; i < 7; i++) {
      const d = addDaysJalali(saturday, i);
      const dateStr = jalaliToFormattedString(d);
      const holidayInfo = isDateHoliday(d);

      // Tasks completed on this specific day
      const completedTasksList = tasks.filter(t => isTaskCompletedOnDate(t, dateStr));

      // Habits logged on this specific day
      const completedHabitsList = habits.filter(h => isHabitCompletedOnDate(h, dateStr));

      // Focus minutes logged on this day
      let focusSecs = 0;
      tasks.forEach(t => {
        if (t.focusSessions) {
          t.focusSessions.forEach(s => {
            if (normalizeDateStr(s.dateStr) === dateStr) {
              focusSecs += s.durationSeconds;
            }
          });
        }
      });
      habits.forEach(h => {
        if (h.focusSessions) {
          h.focusSessions.forEach(s => {
            if (normalizeDateStr(s.dateStr) === dateStr) {
              focusSecs += s.durationSeconds;
            }
          });
        }
      });

      days.push({
        dayIndex: i,
        dayKey: `day_${i}`,
        dayName: WEEKDAYS[i],
        dayShortName: WEEKDAYS_SHORT[i],
        dateStr,
        dayNumber: d.day,
        monthNumber: d.month,
        monthName: PERSIAN_MONTHS[d.month - 1],
        isToday: dateStr === todayStr,
        isHoliday: holidayInfo.isHoliday || holidayInfo.isFriday,
        holidayTitle: holidayInfo.title,
        tasksDone: completedTasksList.length,
        habitsDone: completedHabitsList.length,
        totalActivities: completedTasksList.length + completedHabitsList.length,
        completedTasksList,
        completedHabitsList,
        focusMinutes: Math.round(focusSecs / 60),
      });
    }

    return days;
  }, [anchorDate, todayStr, tasks, habits]);

  // Fast map lookup for day ticks & tooltip
  const dayMap = useMemo(() => {
    const map: Record<string, DayProgressData> = {};
    weekDays.forEach(d => {
      map[d.dayKey] = d;
      map[d.dayName] = d;
      map[d.dateStr] = d;
    });
    return map;
  }, [weekDays]);

  // Weekly aggregate metrics
  const totalTasksDone = useMemo(() => weekDays.reduce((acc, d) => acc + d.tasksDone, 0), [weekDays]);
  const totalHabitsDone = useMemo(() => weekDays.reduce((acc, d) => acc + d.habitsDone, 0), [weekDays]);
  const totalActivities = totalTasksDone + totalHabitsDone;
  const totalFocusMinutes = useMemo(() => weekDays.reduce((acc, d) => acc + d.focusMinutes, 0), [weekDays]);
  const dailyAverage = (totalActivities / 7).toFixed(1);

  // Peak activity day
  const bestDay = useMemo(() => {
    const sorted = [...weekDays].sort((a, b) => b.totalActivities - a.totalActivities);
    return sorted[0]?.totalActivities > 0 ? sorted[0] : null;
  }, [weekDays]);

  // Date range label: e.g. "شنبه ۳ مهر تا جمعه ۹ مهر ۱۴۰۵"
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.monthNumber === end.monthNumber) {
      return `${start.dayName} ${toPersianDigits(start.dayNumber)} تا ${end.dayName} ${toPersianDigits(end.dayNumber)} ${end.monthName}`;
    }
    return `${toPersianDigits(start.dayNumber)} ${start.monthName} تا ${toPersianDigits(end.dayNumber)} ${end.monthName}`;
  }, [weekDays]);

  // Selected Day data object
  const activeSelectedDay = useMemo(() => {
    if (!selectedDayDate) return null;
    return weekDays.find(d => d.dateStr === selectedDayDate) || null;
  }, [selectedDayDate, weekDays]);

  // Recharts Chart dataset with strictly numeric values
  const chartDataset = useMemo(() => {
    return weekDays.map(d => ({
      dayKey: d.dayKey,
      dayName: d.dayName,
      dayShortName: d.dayShortName,
      dateLabel: `${d.dayName} (${toPersianDigits(d.dayNumber)})`,
      dayNumber: d.dayNumber,
      persianDayNumber: toPersianDigits(d.dayNumber),
      tasksDone: Number(d.tasksDone) || 0,
      habitsDone: Number(d.habitsDone) || 0,
      total: Number(d.totalActivities) || 0,
      isToday: d.isToday,
      isHoliday: d.isHoliday,
      dateStr: d.dateStr,
      focusMinutes: Number(d.focusMinutes) || 0,
      raw: d,
    }));
  }, [weekDays]);

  // Deterministic Y-Axis maximum calculation (prevents NaN / collapse bugs in Recharts)
  const maxChartValue = useMemo(() => {
    let max = 0;
    chartDataset.forEach(d => {
      const val = chartMode === 'STACKED' ? d.tasksDone + d.habitsDone : Math.max(d.tasksDone, d.habitsDone);
      if (val > max) max = val;
    });
    // Ensure clean minimum scale of at least 4 ticks
    return Math.max(4, Math.ceil(max * 1.25) || 4);
  }, [chartDataset, chartMode]);

  // Custom Persian Tooltip Component for Recharts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataItem = payload[0]?.payload;
    const raw: DayProgressData = dataItem?.raw || dayMap[dataItem?.dayKey] || dataItem;
    if (!raw) return null;

    return (
      <div 
        className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-200/90 shadow-xl text-right text-xs space-y-2 min-w-[170px]"
        dir="rtl"
      >
        <div className="border-b border-gray-100 pb-1.5 flex items-center justify-between gap-3">
          <span className="font-bold text-gray-900">
            {raw.dayName}، {toPersianDigits(raw.dayNumber)} {raw.monthName}
          </span>
          {raw.isToday && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              امروز
            </span>
          )}
          {raw.holidayTitle && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
              {raw.holidayTitle}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-emerald-800 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
              <span>تسک‌های انجام‌شده:</span>
            </span>
            <span className="font-bold font-mono tabular-nums">{toPersianDigits(raw.tasksDone)}</span>
          </div>

          <div className="flex items-center justify-between text-amber-800 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>عادت‌های ثبت‌شده:</span>
            </span>
            <span className="font-bold font-mono tabular-nums">{toPersianDigits(raw.habitsDone)}</span>
          </div>

          {raw.focusMinutes > 0 && (
            <div className="flex items-center justify-between text-indigo-800 font-medium pt-0.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-indigo-600" />
                <span>زمان تمرکز:</span>
              </span>
              <span className="font-bold font-mono tabular-nums">{toPersianDigits(raw.focusMinutes)} دقیقه</span>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between font-bold text-gray-800">
          <span>مجموع اقدامات:</span>
          <span className="text-emerald-700 font-mono tabular-nums text-sm">
            {toPersianDigits(raw.totalActivities)}
          </span>
        </div>

        <div className="text-[10px] text-gray-400 pt-0.5 text-center">
          برای مشاهده جزئیات روی ستون کلیک کنید
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100/90 shadow-sm space-y-6 ${className}`}>
      {/* Top Header Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                  خلاصه پیشرفت هفتگی
                </h3>
                {weekOffset === 0 ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                    هفته جاری
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {weekOffset < 0 ? `${toPersianDigits(Math.abs(weekOffset))} هفته قبل` : `${toPersianDigits(weekOffset)} هفته بعد`}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>{weekRangeLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* View Switchers & Week Pagination Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Chart Presentation Mode: Grouped vs Stacked */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setChartMode('GROUPED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                chartMode === 'GROUPED'
                  ? 'bg-white text-emerald-950 shadow-2xs'
                  : 'text-gray-600 hover:text-emerald-800'
              }`}
              title="نمایش ستون‌های تفکیک‌شده کنار هم"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>تفکیکی</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('STACKED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                chartMode === 'STACKED'
                  ? 'bg-white text-emerald-950 shadow-2xs'
                  : 'text-gray-600 hover:text-emerald-800'
              }`}
              title="نمایش ستون‌های انباشته مجموع"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>پشته‌ای</span>
            </button>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center bg-gray-50 border border-gray-200/80 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 text-gray-600 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="هفته قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {weekOffset !== 0 ? (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                امروز
              </button>
            ) : (
              <span className="px-2 text-[11px] text-gray-400 select-none">
                جاری
              </span>
            )}

            <button
              type="button"
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 text-gray-600 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="هفته بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Completed Tasks */}
        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3.5 space-y-1 transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>تسک‌های تکمیل‌شده</span>
            <div className="p-1.5 bg-emerald-100/90 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tabular-nums">
            {toPersianDigits(totalTasksDone)}
          </div>
          <div className="text-[11px] text-emerald-700/80 font-medium">
            تسک به سرانجام رسیده
          </div>
        </div>

        {/* Habits Checked */}
        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3.5 space-y-1 transition-all hover:border-amber-300">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>عادت‌های پایدار</span>
            <div className="p-1.5 bg-amber-100/90 text-amber-800 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono tabular-nums">
            {toPersianDigits(totalHabitsDone)}
          </div>
          <div className="text-[11px] text-amber-700/80 font-medium">
            نوبت تکرار و استمرار
          </div>
        </div>

        {/* Daily Velocity & Average */}
        <div className="bg-teal-50/70 border border-teal-200/70 rounded-2xl p-3.5 space-y-1 transition-all hover:border-teal-300">
          <div className="flex items-center justify-between text-teal-800 text-xs font-semibold">
            <span>میانگین بازده روزانه</span>
            <div className="p-1.5 bg-teal-100/90 text-teal-800 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-950 font-mono tabular-nums">
            {toPersianDigits(dailyAverage)}
          </div>
          <div className="text-[11px] text-teal-700/80 font-medium">
            اقدام مؤثر در هر روز
          </div>
        </div>

        {/* Best Day of the Week */}
        <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-3.5 space-y-1 transition-all hover:border-indigo-300">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-semibold">
            <span>اوج بهره‌وری هفته</span>
            <div className="p-1.5 bg-indigo-100/90 text-indigo-800 rounded-xl">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-base font-black text-indigo-950 truncate pt-1">
            {bestDay ? (
              <span className="flex items-baseline gap-1">
                <span>{bestDay.dayName}</span>
                <span className="text-xs font-mono font-normal text-indigo-700">({toPersianDigits(bestDay.totalActivities)} کار)</span>
              </span>
            ) : (
              <span className="text-gray-400 text-xs font-normal">داده‌ای ثبت نشده</span>
            )}
          </div>
          <div className="text-[11px] text-indigo-700/80 font-medium">
            {totalFocusMinutes > 0 ? `${toPersianDigits(totalFocusMinutes)} دقیقه تمرکز کل` : 'پربازده‌ترین روز این هفته'}
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-2xs" />
              <span>تسک‌های انجام‌شده</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-800 font-bold">
              <span className="w-3 h-3 rounded-md bg-amber-400 inline-block shadow-2xs" />
              <span>عادت‌های ثبت‌شده</span>
            </span>
          </div>

          <span className="text-[11px] text-gray-400 hidden sm:inline">
            کلیک روی هر ستون: نمایش کارهای آن روز
          </span>
        </div>

        {/* Responsive Recharts Container with explicit Left-to-Right direction and fallback dimensions */}
        <div 
          dir="ltr" 
          style={{ direction: 'ltr', width: '100%', height: 320, minHeight: 300, position: 'relative' }}
          className="w-full pt-2"
        >
          {isMounted ? (
            <ResponsiveContainer width="100%" height={320} minHeight={280}>
              <BarChart
                data={chartDataset}
                margin={{ top: 15, right: 12, left: -16, bottom: 8 }}
                barGap={chartMode === 'GROUPED' ? 6 : 0}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    const clickedDate = state.activePayload[0].payload?.dateStr;
                    if (clickedDate) {
                      setSelectedDayDate(prev => prev === clickedDate ? null : clickedDate);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                
                <XAxis 
                  dataKey="dayKey" 
                  tick={<CustomXAxisTick dayMap={dayMap} selectedDate={selectedDayDate} />}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  interval={0}
                />

                <YAxis 
                  allowDecimals={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, maxChartValue]}
                  tickCount={5}
                  tickFormatter={(val: number) => toPersianDigits(val)}
                />

                <Tooltip 
                  content={<CustomChartTooltip />} 
                  cursor={{ fill: 'rgba(16, 185, 129, 0.06)', radius: 8 }} 
                />

                <Bar 
                  dataKey="tasksDone" 
                  name="تسک‌ها"
                  fill="#10B981" 
                  stackId={chartMode === 'STACKED' ? 'weeklyStack' : undefined}
                  radius={chartMode === 'STACKED' ? [0, 0, 0, 0] : [6, 6, 0, 0]} 
                  maxBarSize={chartMode === 'STACKED' ? 36 : 24}
                  className="cursor-pointer transition-all duration-300 hover:opacity-90"
                  isAnimationActive={true}
                  animationDuration={600}
                >
                  {chartDataset.map((entry, index) => (
                    <Cell 
                      key={`task-cell-${index}`} 
                      fill={entry.dateStr === selectedDayDate ? '#059669' : '#10B981'} 
                      stroke={entry.isToday ? '#047857' : undefined}
                      strokeWidth={entry.isToday ? 1.5 : 0}
                    />
                  ))}
                </Bar>

                <Bar 
                  dataKey="habitsDone" 
                  name="عادت‌ها"
                  fill="#F59E0B" 
                  stackId={chartMode === 'STACKED' ? 'weeklyStack' : undefined}
                  radius={chartMode === 'STACKED' ? [6, 6, 0, 0] : [6, 6, 0, 0]} 
                  maxBarSize={chartMode === 'STACKED' ? 36 : 24}
                  className="cursor-pointer transition-all duration-300 hover:opacity-90"
                  isAnimationActive={true}
                  animationDuration={600}
                >
                  {chartDataset.map((entry, index) => (
                    <Cell 
                      key={`habit-cell-${index}`} 
                      fill={entry.dateStr === selectedDayDate ? '#D97706' : '#F59E0B'} 
                      stroke={entry.isToday ? '#B45309' : undefined}
                      strokeWidth={entry.isToday ? 1.5 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-[300px] flex items-center justify-center bg-gray-50/50 rounded-2xl border border-gray-100">
              <span className="text-xs text-gray-400">در حال بارگذاری نمودار...</span>
            </div>
          )}
        </div>
      </div>

      {/* Week Days Navigation Strip with Quick Tap to Filter */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1 border-t border-gray-100">
        {weekDays.map((d) => {
          const isSelected = d.dateStr === selectedDayDate;
          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => setSelectedDayDate(prev => prev === d.dateStr ? null : d.dateStr)}
              className={`p-2 rounded-2xl text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30 -translate-y-0.5'
                  : d.isToday
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-300/80 font-bold hover:bg-emerald-100'
                    : 'bg-gray-50/70 hover:bg-gray-100 text-gray-700 border border-gray-100'
              }`}
            >
              <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : d.isToday ? 'text-emerald-700 font-black' : d.isHoliday ? 'text-rose-600' : 'text-gray-400'}`}>
                {d.dayShortName}
              </span>
              <span className="text-xs font-black font-mono tabular-nums">
                {toPersianDigits(d.dayNumber)}
              </span>
              
              {/* Activity count pip */}
              <div className="flex items-center gap-0.5 mt-0.5">
                {d.totalActivities > 0 ? (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {toPersianDigits(d.totalActivities)}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Drill-Down Drawer for Selected Day */}
      {activeSelectedDay && (
        <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white rounded-2xl p-4 border border-emerald-200/90 shadow-2xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {toPersianDigits(activeSelectedDay.dayNumber)}
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">
                  جزئیات اقدامات روز {activeSelectedDay.dayName} ({toPersianDigits(activeSelectedDay.dateStr)})
                </h4>
                <p className="text-[10px] text-emerald-700 font-medium">
                  {toPersianDigits(activeSelectedDay.tasksDone)} تسک تکمیل‌شده · {toPersianDigits(activeSelectedDay.habitsDone)} عادت ثبت‌شده
                  {activeSelectedDay.focusMinutes > 0 && ` · ${toPersianDigits(activeSelectedDay.focusMinutes)} دقیقه تمرکز`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayDate(null)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              بستن جزئیات ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Completed Tasks List for this day */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>تسک‌های انجام‌شده ({toPersianDigits(activeSelectedDay.completedTasksList.length)})</span>
              </span>

              {activeSelectedDay.completedTasksList.length > 0 ? (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {activeSelectedDay.completedTasksList.map((t) => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    return (
                      <div 
                        key={t.id} 
                        className="bg-white p-2 rounded-xl border border-emerald-100 flex items-center justify-between gap-2 shadow-3xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-gray-800 truncate">{t.title}</span>
                        </div>
                        {cat && (
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {cat.title}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white/70 rounded-xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
                  هیچ تسکی در این روز ثبت نهایی نشده است.
                </div>
              )}
            </div>

            {/* Completed Habits List for this day */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>عادت‌های انجام‌شده ({toPersianDigits(activeSelectedDay.completedHabitsList.length)})</span>
              </span>

              {activeSelectedDay.completedHabitsList.length > 0 ? (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {activeSelectedDay.completedHabitsList.map((h) => {
                    const cat = categories.find(c => c.id === h.categoryId);
                    return (
                      <div 
                        key={h.id} 
                        className="bg-white p-2 rounded-xl border border-amber-100 flex items-center justify-between gap-2 shadow-3xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-gray-800 truncate">{h.title}</span>
                        </div>
                        {cat && (
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {cat.title}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-white/70 rounded-xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
                  در این روز عادتی تیک نخورده است.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Motivation & Summary Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-emerald-800 font-medium">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            مجموع کل فعالیت‌های ثبت‌شده در این بازه هفتگی: <strong className="font-mono tabular-nums text-emerald-950 font-bold">{toPersianDigits(totalActivities)}</strong> اقدام
          </span>
        </div>

        <div className="text-[11px] text-gray-400">
          منطبق بر هفته تقویم رسمی ایران (شنبه تا جمعه)
        </div>
      </div>
    </div>
  );
};
