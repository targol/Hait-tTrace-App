import React, { useState, useMemo, useEffect } from 'react';
import { Habit, AppTask, Category } from '../types';
import { 
  getTodayJalali, 
  addDaysJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  WEEKDAYS, 
  WEEKDAYS_SHORT, 
  PERSIAN_MONTHS, 
  isDateHoliday, 
  getDayOfWeek 
} from '../calendar/jalali';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  Flame, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Award, 
  Calendar, 
  Check, 
  Minus, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Clock,
  Layers,
  Filter
} from 'lucide-react';
import { PlantIcon } from './PlantIcon';

interface Props {
  habits: Habit[];
  tasks?: AppTask[];
  categories?: Category[];
  className?: string;
}

export interface DayActivityStat {
  dayIndex: number; // 0 (Saturday) to 6 (Friday)
  dayName: string;
  dayShortName: string;
  dateStr: string; // "1405/07/07"
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isHoliday: boolean;
  holidayTitle?: string;
  // Habits
  scheduledHabits: Habit[];
  completedHabits: Habit[];
  missedHabits: Habit[];
  habitsScheduledCount: number;
  habitsDoneCount: number;
  habitsFulfillmentRate: number; // 0 to 100
  // Tasks
  scheduledTasks: AppTask[];
  completedTasks: AppTask[];
  pendingTasks: AppTask[];
  tasksScheduledCount: number;
  tasksDoneCount: number;
  tasksFulfillmentRate: number; // 0 to 100
  // Combined
  totalDoneCount: number;
  totalScheduledCount: number;
  overallDisciplineRate: number; // 0 to 100
}

/**
 * Normalizes date string to YYYY/MM/DD
 */
function normalizeDate(str?: string | null): string {
  if (!str) return '';
  const trimmed = str.trim().split(' ')[0].split('-')[0].trim();
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    return `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
  }
  return trimmed;
}

/**
 * Check if habit was completed on specific date
 */
function isHabitDone(habit: Habit, targetDateStr: string): boolean {
  if (!habit.completionHistory) return false;
  const norm = normalizeDate(targetDateStr);
  if (habit.completionHistory[norm] || habit.completionHistory[targetDateStr]) return true;

  const parts = norm.split('/');
  if (parts.length === 3) {
    const unpadded = `${parts[0]}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    if (habit.completionHistory[unpadded]) return true;
  }
  return false;
}

/**
 * Checks if a habit is planned / scheduled for a day of week
 */
function isHabitScheduledForDay(habit: Habit, dow: number, isHoliday: boolean): boolean {
  if (habit.isClosed) return false;
  if (habit.exemptHolidays && isHoliday) return false;
  if (habit.exemptWeekends && dow === 6) return false; // Friday

  if (habit.frequency === 'DAILY') {
    if (!habit.targetDaysOfWeek || habit.targetDaysOfWeek.length === 0) return true;
    return habit.targetDaysOfWeek.includes(dow);
  }

  if (habit.frequency === 'WEEKLY') {
    if (habit.targetDaysOfWeek && habit.targetDaysOfWeek.length > 0) {
      return habit.targetDaysOfWeek.includes(dow);
    }
    return true;
  }

  return true;
}

export const HabitWeeklyDisciplineChart: React.FC<Props> = ({
  habits,
  tasks = [],
  categories = [],
  className = '',
}) => {
  // Mounting guard for Recharts container calculation
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = useMemo(() => getTodayJalali(), []);
  const todayStr = useMemo(() => jalaliToFormattedString(today), [today]);

  // Week offset state (0 = current week, -1 = previous week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // View mode: 'STACKED' (تفکیک تسک‌ها و عادات), 'PERCENTAGE' (درصد نظم), 'SEPARATE' (میله‌های مجزا)
  const [chartMode, setChartMode] = useState<'STACKED' | 'PERCENTAGE'>('STACKED');

  // Filter: 'ALL' (همه), 'HABITS' (فقط عادات), 'TASKS' (فقط تسک‌ها)
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'HABITS' | 'TASKS'>('ALL');

  // Selected Day for drilldown inspection (defaults to today in current week)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Drilldown tab: 'ALL' | 'HABITS' | 'TASKS'
  const [drilldownTab, setDrilldownTab] = useState<'ALL' | 'HABITS' | 'TASKS'>('ALL');

  // Target anchor date
  const anchorDate = useMemo(() => {
    return addDaysJalali(today, weekOffset * 7);
  }, [today, weekOffset]);

  // Calculate the 7 days of the Persian week (Saturday to Friday)
  const weekDaysData = useMemo(() => {
    const anchorDOW = getDayOfWeek(anchorDate);
    const saturday = addDaysJalali(anchorDate, -anchorDOW);

    const list: DayActivityStat[] = [];

    for (let i = 0; i < 7; i++) {
      const d = addDaysJalali(saturday, i);
      const dateStr = jalaliToFormattedString(d);
      const normDateStr = normalizeDate(dateStr);
      const holidayInfo = isDateHoliday(d);
      const isDayHoliday = holidayInfo.isHoliday || holidayInfo.isFriday;

      const isCurrentDay = dateStr === todayStr;
      const isPastDay = dateStr < todayStr;
      const isFutureDay = dateStr > todayStr;

      // 1. HABITS
      const scheduledHabits = habits.filter(h => isHabitScheduledForDay(h, i, isDayHoliday));
      const completedHabits = habits.filter(h => isHabitDone(h, dateStr));
      const missedHabits = scheduledHabits.filter(h => !isHabitDone(h, dateStr));
      const habitsScheduledCount = scheduledHabits.length;
      const habitsDoneCount = completedHabits.length;

      let habitsFulfillmentRate = 0;
      if (habitsScheduledCount > 0) {
        habitsFulfillmentRate = Math.min(100, Math.round((habitsDoneCount / habitsScheduledCount) * 100));
      } else if (habitsDoneCount > 0) {
        habitsFulfillmentRate = 100;
      }

      // 2. TASKS
      const completedTasks = tasks.filter(t => {
        if (!t.isCompleted) return false;
        const compDate = normalizeDate(t.completedAt);
        const dueDate = normalizeDate(t.dueDate);
        return compDate === normDateStr || (!compDate && dueDate === normDateStr);
      });

      const scheduledTasks = tasks.filter(t => {
        const dueDate = normalizeDate(t.dueDate);
        if (dueDate === normDateStr) return true;
        if (t.repeatType === 'DAILY') return true;
        if (t.repeatType === 'WEEKLY' && t.repeatDaysOfWeek?.includes(i)) return true;
        return false;
      });

      const pendingTasks = scheduledTasks.filter(t => !t.isCompleted);
      const tasksScheduledCount = scheduledTasks.length;
      const tasksDoneCount = completedTasks.length;

      let tasksFulfillmentRate = 0;
      if (tasksScheduledCount > 0) {
        tasksFulfillmentRate = Math.min(100, Math.round((tasksDoneCount / tasksScheduledCount) * 100));
      } else if (tasksDoneCount > 0) {
        tasksFulfillmentRate = 100;
      }

      // 3. COMBINED
      const totalDoneCount = habitsDoneCount + tasksDoneCount;
      const totalScheduledCount = habitsScheduledCount + tasksScheduledCount;

      let overallDisciplineRate = 0;
      if (totalScheduledCount > 0) {
        overallDisciplineRate = Math.min(100, Math.round((totalDoneCount / totalScheduledCount) * 100));
      } else if (totalDoneCount > 0) {
        overallDisciplineRate = 100;
      }

      list.push({
        dayIndex: i,
        dayName: WEEKDAYS[i],
        dayShortName: WEEKDAYS_SHORT[i],
        dateStr,
        dayNumber: d.day,
        monthName: PERSIAN_MONTHS[d.month - 1],
        isToday: isCurrentDay,
        isPast: isPastDay,
        isFuture: isFutureDay,
        isHoliday: isDayHoliday,
        holidayTitle: holidayInfo.title,
        scheduledHabits,
        completedHabits,
        missedHabits,
        habitsScheduledCount,
        habitsDoneCount,
        habitsFulfillmentRate,
        scheduledTasks,
        completedTasks,
        pendingTasks,
        tasksScheduledCount,
        tasksDoneCount,
        tasksFulfillmentRate,
        totalDoneCount,
        totalScheduledCount,
        overallDisciplineRate,
      });
    }

    return list;
  }, [anchorDate, todayStr, habits, tasks]);

  // Keep selected day synchronized if week changes
  useEffect(() => {
    const match = weekDaysData.find(d => d.dateStr === selectedDateStr);
    if (!match && weekDaysData.length > 0) {
      const todayInWeek = weekDaysData.find(d => d.isToday);
      setSelectedDateStr(todayInWeek ? todayInWeek.dateStr : weekDaysData[0].dateStr);
    }
  }, [weekDaysData, selectedDateStr]);

  // Selected Day Stat
  const selectedDay = useMemo(() => {
    return weekDaysData.find(d => d.dateStr === selectedDateStr) || weekDaysData[0];
  }, [weekDaysData, selectedDateStr]);

  // Elapsed days (up to today)
  const elapsedDays = useMemo(() => {
    return weekDaysData.filter(d => !d.isFuture);
  }, [weekDaysData]);

  // Aggregate metrics
  const totalTasksDoneInWeek = useMemo(() => {
    return weekDaysData.reduce((acc, d) => acc + d.tasksDoneCount, 0);
  }, [weekDaysData]);

  const totalHabitsDoneInWeek = useMemo(() => {
    return weekDaysData.reduce((acc, d) => acc + d.habitsDoneCount, 0);
  }, [weekDaysData]);

  const totalActivitiesDoneInWeek = totalTasksDoneInWeek + totalHabitsDoneInWeek;

  // Average discipline rate
  const averageDisciplineRate = useMemo(() => {
    if (elapsedDays.length === 0) return 0;
    const sum = elapsedDays.reduce((acc, d) => acc + d.overallDisciplineRate, 0);
    return Math.round(sum / elapsedDays.length);
  }, [elapsedDays]);

  // High discipline days (>= 75%)
  const highDisciplineDaysCount = useMemo(() => {
    return elapsedDays.filter(d => d.overallDisciplineRate >= 75).length;
  }, [elapsedDays]);

  // Best day of the week
  const peakDay = useMemo(() => {
    const sorted = [...elapsedDays].sort((a, b) => b.totalDoneCount - a.totalDoneCount);
    return sorted.length > 0 && sorted[0].totalDoneCount > 0 ? sorted[0] : null;
  }, [elapsedDays]);

  // Week range label e.g. "شنبه ۳ مهر تا جمعه ۹ مهر ۱۴۰۵"
  const weekRangeLabel = useMemo(() => {
    if (weekDaysData.length < 7) return '';
    const start = weekDaysData[0];
    const end = weekDaysData[6];
    return `${start.dayName} ${toPersianDigits(start.dayNumber)} ${start.monthName} تا ${end.dayName} ${toPersianDigits(end.dayNumber)} ${end.monthName}`;
  }, [weekDaysData]);

  // Recharts Dataset
  const chartDataset = useMemo(() => {
    return weekDaysData.map(d => ({
      dayKey: `day_${d.dayIndex}`,
      dayName: d.dayName,
      dayShortName: d.dayShortName,
      dayNumber: d.dayNumber,
      persianDayNumber: toPersianDigits(d.dayNumber),
      dateStr: d.dateStr,
      tasksDone: d.tasksDoneCount,
      habitsDone: d.habitsDoneCount,
      totalDone: d.totalDoneCount,
      overallDisciplineRate: d.overallDisciplineRate,
      habitsRate: d.habitsFulfillmentRate,
      tasksRate: d.tasksFulfillmentRate,
      isToday: d.isToday,
      isFuture: d.isFuture,
      isHoliday: d.isHoliday,
      raw: d,
    }));
  }, [weekDaysData]);

  // Color for percentage rate bars
  const getRateBarColor = (rate: number, isFuture: boolean, isSelected: boolean) => {
    if (isFuture) return isSelected ? '#CBD5E1' : '#E2E8F0';
    if (rate >= 85) return '#059669'; // Emerald-600
    if (rate >= 65) return '#10B981'; // Emerald-500
    if (rate >= 40) return '#F59E0B'; // Amber-500
    if (rate > 0) return '#FB923C'; // Orange-400
    return '#E11D48'; // Rose-600
  };

  // Custom Tick Component
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload || payload.value === undefined) return null;
    const item = chartDataset[payload.index];
    if (!item) return null;

    const isSelected = item.dateStr === selectedDateStr;
    const isToday = item.isToday;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="middle"
          fill={isSelected ? '#059669' : isToday ? '#10B981' : item.isFuture ? '#9CA3AF' : '#374151'}
          fontSize={11}
          fontWeight={isToday || isSelected ? 800 : 600}
          fontFamily="Vazirmatn, sans-serif"
        >
          {item.dayShortName}
        </text>
        <text
          x={0}
          y={0}
          dy={28}
          textAnchor="middle"
          fill={isSelected ? '#059669' : isToday ? '#10B981' : '#9CA3AF'}
          fontSize={10}
          fontWeight={isToday ? 700 : 500}
          fontFamily="Vazirmatn, sans-serif"
        >
          {item.persianDayNumber}
        </text>
        {isToday && (
          <circle cx={0} cy={34} r={2.5} fill="#10B981" />
        )}
      </g>
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataItem = payload[0]?.payload;
    const raw: DayActivityStat = dataItem?.raw;
    if (!raw) return null;

    return (
      <div 
        className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-200/90 shadow-xl text-right text-xs space-y-2 min-w-[210px]"
        dir="rtl"
      >
        <div className="border-b border-gray-100 pb-1.5 flex items-center justify-between gap-2">
          <div className="font-bold text-gray-900">
            {raw.dayName}، {toPersianDigits(raw.dayNumber)} {raw.monthName}
          </div>
          {raw.isToday ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              امروز
            </span>
          ) : raw.isFuture ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
              پیش‌رو
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-emerald-800 font-semibold">
            <span>درصد انضباط روز:</span>
            <span className="text-sm font-extrabold font-mono">{toPersianDigits(raw.overallDisciplineRate)}٪</span>
          </div>

          <div className="flex items-center justify-between text-gray-700">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              <span>تسک‌های تکمیل‌شده:</span>
            </span>
            <span className="font-bold">{toPersianDigits(raw.tasksDoneCount)}</span>
          </div>

          <div className="flex items-center justify-between text-gray-700">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>عادت‌های انجام‌شده:</span>
            </span>
            <span className="font-bold">{toPersianDigits(raw.habitsDoneCount)}</span>
          </div>

          <div className="pt-1 border-t border-gray-100 flex items-center justify-between font-bold text-gray-900">
            <span>مجموع فعالیت‌ها:</span>
            <span className="font-mono text-emerald-800">{toPersianDigits(raw.totalDoneCount)}</span>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 pt-1 text-center">
          برای بررسی جزئیات این روز کلیک کنید
        </div>
      </div>
    );
  };

  const getCategory = (catId?: string) => categories.find(c => c.id === catId);

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100/90 shadow-sm space-y-6 ${className}`}>
      {/* 1. Header with Title & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                  نمودار ستونی تکمیل تسک‌ها و عادات در هفته جاری
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
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{weekRangeLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* View Switches & Week Pager */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Activity filter: All vs Habits vs Tasks */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 text-xs">
            <button
              type="button"
              onClick={() => setActivityFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activityFilter === 'ALL'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              همه فعالیت‌ها
            </button>
            <button
              type="button"
              onClick={() => setActivityFilter('TASKS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activityFilter === 'TASKS'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              تسک‌ها
            </button>
            <button
              type="button"
              onClick={() => setActivityFilter('HABITS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activityFilter === 'HABITS'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              عادت‌ها
            </button>
          </div>

          {/* Chart mode toggle: Stacked count vs Percentage */}
          <div className="flex items-center bg-emerald-50/80 p-0.5 rounded-xl border border-emerald-200/70 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('STACKED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMode === 'STACKED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              تعداد تفکیکی
            </button>
            <button
              type="button"
              onClick={() => setChartMode('PERCENTAGE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartMode === 'PERCENTAGE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              درصد انضباط (٪)
            </button>
          </div>

          {/* Week Pagination */}
          <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200/80 p-0.5">
            <button
              type="button"
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="هفته قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                امروز
              </button>
            )}
            <button
              type="button"
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="هفته بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Discipline KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Average Consistency */}
        <div className="bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
            <span className="font-semibold">میانگین انضباط هفتگی</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {toPersianDigits(averageDisciplineRate)}٪
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-1">
            {highDisciplineDaysCount > 0 ? `${toPersianDigits(highDisciplineDaysCount)} روز با انضباط عالی` : 'پایبندی روزانه در هفته جاری'}
          </p>
        </div>

        {/* Card 2: Completed Tasks */}
        <div className="bg-teal-50/50 rounded-2xl p-3.5 border border-teal-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-teal-800 mb-1">
            <span className="font-semibold">تسک‌های تکمیل‌شده</span>
            <CheckSquare className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-950 font-mono">
            {toPersianDigits(totalTasksDoneInWeek)} <span className="text-xs font-normal text-teal-700">تسک</span>
          </div>
          <p className="text-[11px] text-teal-700/80 mt-1">
            مجموع تسک‌های ثبت شده در این هفته
          </p>
        </div>

        {/* Card 3: Completed Habits */}
        <div className="bg-amber-50/50 rounded-2xl p-3.5 border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span className="font-semibold">عادت‌های انجام‌شده</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {toPersianDigits(totalHabitsDoneInWeek)} <span className="text-xs font-normal text-amber-700">بار</span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">
            انجام موفق عادت‌های روتین
          </p>
        </div>

        {/* Card 4: Peak Day */}
        <div className="bg-indigo-50/50 rounded-2xl p-3.5 border border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-800 mb-1">
            <span className="font-semibold">بهترین روز هفته</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-950 truncate">
            {peakDay ? peakDay.dayName : '—'}
          </div>
          <p className="text-[11px] text-indigo-700/80 mt-1">
            {peakDay ? `${toPersianDigits(peakDay.totalDoneCount)} فعالیت ثبت‌شده` : 'ثبت مداوم فعالیت‌ها'}
          </p>
        </div>
      </div>

      {/* 3. The Main Bar Chart */}
      <div className="space-y-3">
        {/* Chart Legend & Instruction */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 px-1">
          <div className="flex items-center gap-3">
            {chartMode === 'STACKED' ? (
              <>
                {(activityFilter === 'ALL' || activityFilter === 'TASKS') && (
                  <span className="flex items-center gap-1.5 font-medium text-emerald-800">
                    <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block shadow-2xs" />
                    <span>تسک‌های تکمیل‌شده</span>
                  </span>
                )}
                {(activityFilter === 'ALL' || activityFilter === 'HABITS') && (
                  <span className="flex items-center gap-1.5 font-medium text-amber-800">
                    <span className="w-3 h-3 rounded-md bg-amber-500 inline-block shadow-2xs" />
                    <span>عادت‌های انجام‌شده</span>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>عالی (۸۵٪+)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>خوب (۶۵٪-۸۴٪)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>متوسط (۴۰٪-۶۴٪)</span>
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium hidden md:block">
            برای بررسی تسک‌ها و عادت‌های هر روز، روی ستون آن کلیک کنید
          </div>
        </div>

        <div className="h-68 sm:h-76 w-full pt-4 pb-2 bg-emerald-50/20 rounded-2xl border border-emerald-100/60 relative">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataset}
                margin={{ top: 20, right: 12, left: -10, bottom: 25 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const clickedItem = state.activePayload[0].payload;
                    if (clickedItem && clickedItem.dateStr) {
                      setSelectedDateStr(clickedItem.dateStr);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="dayKey" 
                  tick={<CustomXAxisTick />}
                  interval={0}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={chartMode === 'PERCENTAGE' ? [0, 100] : [0, 'dataMax + 2']}
                  ticks={chartMode === 'PERCENTAGE' ? [0, 25, 50, 75, 80, 100] : undefined}
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Vazirmatn' }}
                  tickFormatter={(val) => chartMode === 'PERCENTAGE' ? `${toPersianDigits(val)}٪` : toPersianDigits(val)}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                
                {/* 80% Benchmark Reference Line for discipline goal in percentage mode */}
                {chartMode === 'PERCENTAGE' && (
                  <ReferenceLine 
                    y={80} 
                    stroke="#10B981" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: 'خط انضباط ایده‌آل (۸۰٪)', 
                      position: 'top', 
                      fill: '#059669', 
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: 'Vazirmatn'
                    }} 
                  />
                )}

                {/* Render Bars according to selected mode & filters */}
                {chartMode === 'PERCENTAGE' ? (
                  <Bar 
                    dataKey="overallDisciplineRate" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={44}
                    className="cursor-pointer transition-all duration-300"
                  >
                    {chartDataset.map((entry) => {
                      const isSelected = entry.dateStr === selectedDateStr;
                      return (
                        <Cell 
                          key={`cell-rate-${entry.dayKey}`} 
                          fill={getRateBarColor(entry.overallDisciplineRate, entry.isFuture, isSelected)}
                          stroke={isSelected ? '#047857' : 'none'}
                          strokeWidth={isSelected ? 2.5 : 0}
                        />
                      );
                    })}
                  </Bar>
                ) : (
                  <>
                    {(activityFilter === 'ALL' || activityFilter === 'TASKS') && (
                      <Bar 
                        dataKey="tasksDone" 
                        name="تسک‌ها"
                        stackId={activityFilter === 'ALL' ? 'a' : undefined}
                        fill="#059669"
                        radius={activityFilter === 'TASKS' || activityFilter === 'ALL' ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-all duration-300"
                      />
                    )}
                    {(activityFilter === 'ALL' || activityFilter === 'HABITS') && (
                      <Bar 
                        dataKey="habitsDone" 
                        name="عادت‌ها"
                        stackId={activityFilter === 'ALL' ? 'a' : undefined}
                        fill="#F59E0B"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={42}
                        className="cursor-pointer transition-all duration-300"
                      />
                    )}
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Interactive Drilldown Section for Selected Day */}
      {selectedDay && (
        <div className="bg-gray-50/70 rounded-2xl p-4 sm:p-5 border border-gray-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-gray-900">
                  وضعیت روز {selectedDay.dayName} ({toPersianDigits(selectedDay.dayNumber)} {selectedDay.monthName})
                </span>
                {selectedDay.isToday && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    امروز
                  </span>
                )}
                {selectedDay.isFuture && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                    روز پیش‌رو
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDay.isFuture 
                  ? 'برنامه فعالیت‌ها و عاداتی که برای این روز تنظیم شده‌اند'
                  : `در این روز ${toPersianDigits(selectedDay.tasksDoneCount)} تسک و ${toPersianDigits(selectedDay.habitsDoneCount)} عادت با موفقیت انجام شد.`
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Drilldown Category Tabs */}
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setDrilldownTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    drilldownTab === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  همه ({toPersianDigits(selectedDay.totalDoneCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownTab('TASKS')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    drilldownTab === 'TASKS'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  تسک‌ها ({toPersianDigits(selectedDay.tasksDoneCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownTab('HABITS')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    drilldownTab === 'HABITS'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  عادت‌ها ({toPersianDigits(selectedDay.habitsDoneCount)})
                </button>
              </div>

              {/* Day Discipline Pill */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                <span className="text-[11px] font-bold text-gray-600">انضباط:</span>
                <span className={`text-xs font-black font-mono ${
                  selectedDay.overallDisciplineRate >= 80 
                    ? 'text-emerald-700' 
                    : selectedDay.overallDisciplineRate >= 50 
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}>
                  {toPersianDigits(selectedDay.overallDisciplineRate)}٪
                </span>
              </div>
            </div>
          </div>

          {/* Activities list for selected day */}
          <div className="space-y-4">
            {/* 1. Tasks Section */}
            {(drilldownTab === 'ALL' || drilldownTab === 'TASKS') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600 font-bold px-1">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تسک‌های این روز</span>
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {toPersianDigits(selectedDay.tasksDoneCount)} تکمیل شده
                  </span>
                </div>

                {selectedDay.completedTasks.length === 0 && selectedDay.pendingTasks.length === 0 ? (
                  <div className="text-center py-4 bg-white rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                    تسکی برای این روز ثبت یا برنامه‌ریزی نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Completed Tasks */}
                    {selectedDay.completedTasks.map((t) => {
                      const cat = getCategory(t.categoryId);
                      return (
                        <div
                          key={`task-done-${t.id}`}
                          className="bg-white rounded-xl border border-emerald-200 p-3 flex items-center justify-between shadow-2xs hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {t.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                {cat && <span className="truncate">{cat.title}</span>}
                                {t.time && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{toPersianDigits(t.time)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                            تکمیل شد
                          </span>
                        </div>
                      );
                    })}

                    {/* Pending Tasks */}
                    {selectedDay.pendingTasks.map((t) => {
                      const cat = getCategory(t.categoryId);
                      return (
                        <div
                          key={`task-pending-${t.id}`}
                          className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between shadow-2xs transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-700 truncate">
                                {t.title}
                              </p>
                              {cat && (
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {cat.title}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg shrink-0">
                            در انتظار
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Habits Section */}
            {(drilldownTab === 'ALL' || drilldownTab === 'HABITS') && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-600 font-bold px-1">
                  <span className="flex items-center gap-1.5 text-amber-800">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>عادت‌های این روز</span>
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {toPersianDigits(selectedDay.habitsDoneCount)} از {toPersianDigits(selectedDay.habitsScheduledCount)} ثبت شده
                  </span>
                </div>

                {selectedDay.scheduledHabits.length === 0 && selectedDay.completedHabits.length === 0 ? (
                  <div className="text-center py-4 bg-white rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                    عادتی برای این روز برنامه‌ریزی نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Completed habits */}
                    {selectedDay.completedHabits.map((habit) => {
                      const cat = getCategory(habit.categoryId);
                      return (
                        <div
                          key={`habit-done-${habit.id}`}
                          className="bg-white rounded-xl border border-amber-200 p-3 flex items-center justify-between shadow-2xs hover:border-amber-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                              <PlantIcon type={habit.plantType} size="xs" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {habit.title}
                              </p>
                              {cat && (
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {cat.title}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg text-[11px] font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>ثبت شده</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Missed / Scheduled habits */}
                    {selectedDay.missedHabits.map((habit) => {
                      const cat = getCategory(habit.categoryId);
                      return (
                        <div
                          key={`habit-missed-${habit.id}`}
                          className={`bg-white rounded-xl border p-3 flex items-center justify-between shadow-2xs transition-colors ${
                            selectedDay.isFuture ? 'border-gray-200 opacity-80' : 'border-rose-200/80 bg-rose-50/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                              <PlantIcon type={habit.plantType} size="xs" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">
                                {habit.title}
                              </p>
                              {cat && (
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {cat.title}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={`flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg text-[11px] font-medium ${
                            selectedDay.isFuture 
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-rose-50 text-rose-700 font-bold'
                          }`}>
                            {selectedDay.isFuture ? (
                              <span>برنامه‌ریزی‌شده</span>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>انجام‌نشده</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Habit Discipline Matrix for This Week */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>ماتریس پیوستگی تک‌تک عادات در طول هفته</span>
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              نمای کلی وضعیت ثبت هر عادت از شنبه تا جمعه
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {toPersianDigits(habits.filter(h => !h.isClosed).length)} عادت فعال
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-400">
                <th className="py-2 pr-2 font-medium">عادت</th>
                {weekDaysData.map(d => (
                  <th key={d.dayIndex} className="py-2 px-1.5 text-center font-medium min-w-[34px]">
                    <span className={d.isToday ? 'text-emerald-700 font-bold' : ''}>
                      {d.dayShortName}
                    </span>
                  </th>
                ))}
                <th className="py-2 pl-2 text-center font-medium min-w-[50px]">پایبندی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {habits.filter(h => !h.isClosed).map(habit => {
                // Calculate adherence for this habit in this week
                let habitScheduledDays = 0;
                let habitCompletedDays = 0;

                weekDaysData.forEach(d => {
                  const scheduled = isHabitScheduledForDay(habit, d.dayIndex, d.isHoliday);
                  const done = isHabitDone(habit, d.dateStr);
                  if (scheduled && !d.isFuture) {
                    habitScheduledDays++;
                    if (done) habitCompletedDays++;
                  }
                });

                const habitRate = habitScheduledDays > 0 
                  ? Math.round((habitCompletedDays / habitScheduledDays) * 100) 
                  : 0;

                return (
                  <tr key={habit.id} className="hover:bg-emerald-50/20 transition-colors">
                    {/* Habit Title & Icon */}
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2 min-w-[130px]">
                        <PlantIcon type={habit.plantType} size="xs" />
                        <span className="font-bold text-gray-800 truncate max-w-[140px] sm:max-w-[200px]">
                          {habit.title}
                        </span>
                      </div>
                    </td>

                    {/* 7 Days Indicators */}
                    {weekDaysData.map(d => {
                      const scheduled = isHabitScheduledForDay(habit, d.dayIndex, d.isHoliday);
                      const done = isHabitDone(habit, d.dateStr);

                      return (
                        <td key={d.dayIndex} className="py-2.5 px-1.5 text-center">
                          {!scheduled ? (
                            <span className="inline-block w-4 h-4 text-gray-300">
                              <Minus className="w-3.5 h-3.5 mx-auto" />
                            </span>
                          ) : done ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          ) : d.isFuture ? (
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-200" title="روز پیش‌رو" />
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Weekly Rate Percentage */}
                    <td className="py-2.5 pl-2 text-center">
                      <span className={`text-[11px] font-extrabold font-mono ${
                        habitRate >= 80 
                          ? 'text-emerald-700' 
                          : habitRate >= 50 
                            ? 'text-amber-600' 
                            : 'text-gray-400'
                      }`}>
                        {toPersianDigits(habitRate)}٪
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
