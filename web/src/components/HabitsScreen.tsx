import React, { useState, useMemo } from 'react';
import { Habit, Category, Goal } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  WEEKDAYS, 
  WEEKDAYS_SHORT, 
  getDayOfWeek,
  addDaysJalali,
  isDateHoliday,
  PERSIAN_MONTHS,
  getDaysInJalaliMonth,
  parseJalaliString
} from '../calendar/jalali';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Target, 
  Calendar,
  Check,
  CalendarCheck2,
  Filter,
  CalendarDays,
  History,
  X,
  Archive,
  Sparkles,
  Copy,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { PlantIcon } from './PlantIcon';

import { HabitContributionGrid } from './HabitContributionGrid';
import { Hourglass } from 'lucide-react';
import { FocusHistoryModal } from './FocusHistoryModal';

const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
const SEASON_ICONS = ['🌸', '☀️', '🍂', '❄️'];

interface Props {
  habits: Habit[];
  categories: Category[];
  goals: Goal[];
  onToggleHabitDate: (habitId: string, dateStr: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onEditHabit: (habit: Habit) => void;
  onDuplicateHabit?: (habit: Habit) => void;
  onNewHabit: () => void;
  onOpenTimer: (
    title: string,
    minutes: number,
    onDone?: (elapsedSeconds: number, isFullyCompleted: boolean) => void,
    options?: {
      entityType?: 'TASK' | 'HABIT';
      taskId?: string;
      habitId?: string;
      initialElapsedSeconds?: number;
      currentProgressPercent?: number;
    }
  ) => void;
  onToggleCloseHabit?: (habitId: string) => void;
}

export const HabitsScreen: React.FC<Props> = ({
  habits,
  categories,
  goals,
  onToggleHabitDate,
  onDeleteHabit,
  onEditHabit,
  onDuplicateHabit,
  onNewHabit,
  onOpenTimer,
  onToggleCloseHabit,
}) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);
  const todayDayOfWeek = getDayOfWeek(today); // 0=Sat, 1=Sun, ..., 6=Fri

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSchedule, setFilterSchedule] = useState<'ACTIVE' | 'TODAY_DUE' | 'COMPLETED_TODAY' | 'CLOSED' | 'ALL'>('ACTIVE');
  const [expandedGrid, setExpandedGrid] = useState<Record<string, boolean>>({});
  const [customDateModalHabit, setCustomDateModalHabit] = useState<Habit | null>(null);
  const [customDateInput, setCustomDateInput] = useState<string>(todayStr);
  const [focusHistoryHabit, setFocusHistoryHabit] = useState<Habit | null>(null);

  // Weekly BarChart & Compact Calendar states
  const [showWeeklyChart, setShowWeeklyChart] = useState<boolean>(true);
  const [chartMetric, setChartMetric] = useState<'PERCENT' | 'DAYS'>('PERCENT');
  const [displayMode, setDisplayMode] = useState<'BOTH' | 'CALENDAR_ONLY' | 'CARDS_ONLY'>('BOTH');
  const [calendarSubMode, setCalendarSubMode] = useState<'MONTHLY' | 'WEEKLY_MATRIX'>('MONTHLY');
  const [calYear, setCalYear] = useState<number>(today.year);
  const [calMonth, setCalMonth] = useState<number>(today.month);
  const [selectedCalDateStr, setSelectedCalDateStr] = useState<string>(todayStr);

  const getCategory = (catId: string) => categories.find(c => c.id === catId);
  const getGoal = (goalId?: string | null) => goals.find(g => g.id === goalId);

  const activeHabits = habits.filter(h => !h.isClosed);
  const closedHabits = habits.filter(h => !!h.isClosed);

  // Filter habits based on category and schedule
  const filteredHabits = habits.filter(h => {
    if (filterCategory !== 'ALL' && h.categoryId !== filterCategory) return false;
    
    const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    const isDueToday = targetDays.includes(todayDayOfWeek);
    const isDoneToday = !!h.completionHistory?.[todayStr];

    if (filterSchedule === 'ACTIVE' && h.isClosed) return false;
    if (filterSchedule === 'TODAY_DUE' && (h.isClosed || !isDueToday)) return false;
    if (filterSchedule === 'COMPLETED_TODAY' && (h.isClosed || !isDoneToday)) return false;
    if (filterSchedule === 'CLOSED' && !h.isClosed) return false;

    return true;
  });

  // Recent 7 days (from 6 days ago up to today) for weekly progress calculation
  const recentSevenDays = useMemo(() => {
    return [-6, -5, -4, -3, -2, -1, 0].map(offset => {
      const d = addDaysJalali(today, offset);
      return {
        date: d,
        dateStr: jalaliToFormattedString(d),
        dow: getDayOfWeek(d),
      };
    });
  }, [todayStr]);

  // Current week 7 days (Saturday to Friday)
  const currentWeekDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map(dIdx => {
      const offset = dIdx - todayDayOfWeek;
      const d = addDaysJalali(today, offset);
      return {
        dIdx,
        date: d,
        dateStr: jalaliToFormattedString(d),
        isToday: dIdx === todayDayOfWeek,
        holiday: isDateHoliday(d),
      };
    });
  }, [todayStr, todayDayOfWeek]);

  // BarChart data for each habit in the recent week
  const weeklyHabitChartData = useMemo(() => {
    const source = filteredHabits.length > 0 ? filteredHabits : activeHabits;
    return source.map(h => {
      const cat = getCategory(h.categoryId);
      const targetDays = h.targetDaysOfWeek && h.targetDaysOfWeek.length > 0
        ? h.targetDaysOfWeek
        : [0, 1, 2, 3, 4, 5, 6];
      const targetCount = h.frequency === 'WEEKLY'
        ? Math.max(1, h.targetCountPerWeek || targetDays.length || 1)
        : Math.max(1, targetDays.length);

      let completedInRecentWeek = 0;
      recentSevenDays.forEach(dayObj => {
        if (h.completionHistory?.[dayObj.dateStr]) {
          completedInRecentWeek++;
        }
      });

      const progressPercent = Math.min(100, Math.round((completedInRecentWeek / targetCount) * 100));
      const shortName = h.title.length > 14 ? h.title.slice(0, 14) + '…' : h.title;

      return {
        id: h.id,
        name: shortName,
        fullTitle: h.title,
        completedDays: completedInRecentWeek,
        targetDays: targetCount,
        progressPercent,
        color: cat?.colorHex || '#059669',
        categoryTitle: cat?.title || 'عمومی',
        plantType: h.plantType,
      };
    });
  }, [filteredHabits, activeHabits, recentSevenDays, categories]);

  // Monthly compact calendar cells for habits
  const monthlyCalendarCells = useMemo(() => {
    const daysCount = getDaysInJalaliMonth(calYear, calMonth);
    const firstDayDow = getDayOfWeek({ year: calYear, month: calMonth, day: 1 });
    const cells: Array<{
      key: string;
      empty?: boolean;
      day?: number;
      dateStr?: string;
      dow?: number;
      isToday?: boolean;
      isSelected?: boolean;
      isHoliday?: boolean;
      holidayTitle?: string;
      dueHabitsCount?: number;
      completedHabits?: Habit[];
    }> = [];

    for (let i = 0; i < firstDayDow; i++) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    const pool = filteredHabits.length > 0 ? filteredHabits : activeHabits;

    for (let d = 1; d <= daysCount; d++) {
      const jDate = { year: calYear, month: calMonth, day: d };
      const dateStr = jalaliToFormattedString(jDate);
      const dow = getDayOfWeek(jDate);
      const hol = isDateHoliday(jDate);

      const dueHabits = pool.filter(h => {
        const tDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
        return tDays.includes(dow) || Boolean(h.completionHistory?.[dateStr]);
      });

      const completedHabits = pool.filter(h => Boolean(h.completionHistory?.[dateStr]));

      cells.push({
        key: dateStr,
        day: d,
        dateStr,
        dow,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedCalDateStr,
        isHoliday: hol.isHoliday,
        holidayTitle: hol.title,
        dueHabitsCount: dueHabits.length,
        completedHabits,
      });
    }

    return cells;
  }, [calYear, calMonth, filteredHabits, activeHabits, todayStr, selectedCalDateStr]);

  const selectedCalParsed = useMemo(() => {
    return parseJalaliString(selectedCalDateStr) || today;
  }, [selectedCalDateStr, today]);

  const selectedCalDow = getDayOfWeek(selectedCalParsed);

  const handlePrevCalMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const handleNextCalMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  // Calculate today stats based on active habits
  const totalDueToday = activeHabits.filter(h => {
    const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    return targetDays.includes(todayDayOfWeek);
  }).length;

  const completedTodayCount = activeHabits.filter(h => {
    const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    return targetDays.includes(todayDayOfWeek) && !!h.completionHistory?.[todayStr];
  }).length;

  // Helper to find the next scheduled day name
  const getNextScheduledDayName = (targetDays: number[]): string => {
    if (!targetDays || targetDays.length === 0) return 'تنظیم نشده';
    if (targetDays.length === 7) return 'فردا';
    
    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIdx = (todayDayOfWeek + offset) % 7;
      if (targetDays.includes(nextDayIdx)) {
        if (offset === 1) return 'فردا (' + WEEKDAYS[nextDayIdx] + ')';
        return WEEKDAYS[nextDayIdx];
      }
    }
    return WEEKDAYS[targetDays[0]];
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* Sticky Header & Filter Tabs */}
      <div className="sticky -top-5 z-20 pt-5 pb-2.5 bg-[#F8F9F5]/95 backdrop-blur-md space-y-3 -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* Header & New Habit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>عادت‌ها و تکرار دوره‌ای</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {toPersianDigits(completedTodayCount)} از {toPersianDigits(totalDueToday)} انجام شده برای امروز
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              مشاهده تناوب تکرار، نمودار پیشرفت هفتگی و نمای خلاصه تقویمی عادت‌ها
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Selector: Both / Compact Calendar / Cards */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDisplayMode('BOTH')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'BOTH'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="نمایش تقویم خلاصه به همراه کارت‌های عادت"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                <span>ترکیبی</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('CALENDAR_ONLY')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'CALENDAR_ONLY'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="نمایش خلاصه عادت‌ها روی تقویم"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>تقویم خلاصه</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('CARDS_ONLY')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'CARDS_ONLY'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="نمایش کارت‌های کامل عادت"
              >
                <List className="w-3.5 h-3.5 text-emerald-600" />
                <span>کارت‌ها</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onNewHabit}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>عادت جدید</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterSchedule('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterSchedule === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              عادت‌های جاری ({toPersianDigits(activeHabits.length)})
            </button>
            <button
              type="button"
              onClick={() => setFilterSchedule('TODAY_DUE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterSchedule === 'TODAY_DUE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>موعد امروز ({toPersianDigits(totalDueToday)})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSchedule('COMPLETED_TODAY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterSchedule === 'COMPLETED_TODAY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>انجام شده امروز ({toPersianDigits(completedTodayCount)})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSchedule('CLOSED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterSchedule === 'CLOSED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>عادات بسته‌شده ({toPersianDigits(closedHabits.length)})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSchedule('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterSchedule === 'ALL'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              همه ({toPersianDigits(habits.length)})
            </button>
          </div>

          {/* Category filter dropdown */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-gray-700 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="ALL">همه دسته‌ها</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: Weekly Habit Progress Bar Chart (Recharts) */}
      {weeklyHabitChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              onClick={() => setShowWeeklyChart(prev => !prev)}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <span>نمودار پیشرفت هر عادت در هفته اخیر</span>
                  <span className="text-[11px] font-normal text-gray-500">
                    (۷ روز گذشته تا امروز)
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  مقایسه میزان پایبندی و درصد تحقق هر عادت در طول یک هفته اخیر
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showWeeklyChart && (
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setChartMetric('PERCENT')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartMetric === 'PERCENT'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    درصد پیشرفت (٪)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('DAYS')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartMetric === 'DAYS'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    تعداد روز (از ۷)
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowWeeklyChart(prev => !prev)}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                title={showWeeklyChart ? 'بستن نمودار' : 'نمایش نمودار'}
              >
                {showWeeklyChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showWeeklyChart && (
            <div className="pt-2 space-y-3">
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyHabitChartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      interval={0}
                      angle={weeklyHabitChartData.length > 5 ? -20 : 0}
                      textAnchor={weeklyHabitChartData.length > 5 ? 'end' : 'middle'}
                      height={weeklyHabitChartData.length > 5 ? 50 : 30}
                    />
                    <YAxis
                      domain={chartMetric === 'PERCENT' ? [0, 100] : [0, 7]}
                      tickFormatter={(val) =>
                        chartMetric === 'PERCENT'
                          ? `${toPersianDigits(val)}٪`
                          : `${toPersianDigits(val)}`
                      }
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div
                            dir="rtl"
                            className="bg-white/95 backdrop-blur-xs border border-emerald-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]"
                          >
                            <div className="font-extrabold text-gray-900 flex items-center justify-between gap-2 border-b border-gray-100 pb-1">
                              <span>{item.fullTitle}</span>
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded font-bold"
                                style={{
                                  backgroundColor: `${item.color}20`,
                                  color: item.color,
                                }}
                              >
                                {item.categoryTitle}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-gray-600">
                              <span>پیشرفت هفته اخیر:</span>
                              <strong className="font-mono font-extrabold text-emerald-700">
                                {toPersianDigits(item.progressPercent)}٪
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-gray-600">
                              <span>روزهای انجام‌شده:</span>
                              <strong className="font-bold text-gray-900">
                                {toPersianDigits(item.completedDays)} از {toPersianDigits(item.targetDays)} روز
                              </strong>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey={chartMetric === 'PERCENT' ? 'progressPercent' : 'completedDays'}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                    >
                      {weeklyHabitChartData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.progressPercent >= 80 ? '#059669' : entry.color || '#10B981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Compact Legend Pills below chart */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                <div className="flex flex-wrap items-center gap-3">
                  {weeklyHabitChartData.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.progressPercent >= 80 ? '#059669' : item.color }}
                      />
                      <span className="font-medium text-gray-700">{item.name}:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {toPersianDigits(item.completedDays)}/{toPersianDigits(item.targetDays)} ({toPersianDigits(item.progressPercent)}٪)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Compact Habits Calendar Summary View (نمای خلاصه عادت‌ها روی تقویم) */}
      {(displayMode === 'BOTH' || displayMode === 'CALENDAR_ONLY') && filteredHabits.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Header & Sub-mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  تقویم خلاصه عادت‌ها
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  مشاهده و ثبت سریع تمام عادت‌ها به صورت فشرده روی تقویم ماهانه یا جدول هفتگی
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Sub-mode toggle: Monthly Calendar vs Compact Weekly Matrix */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCalendarSubMode('MONTHLY')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    calendarSubMode === 'MONTHLY'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  تقویم ماهانه
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSubMode('WEEKLY_MATRIX')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    calendarSubMode === 'WEEKLY_MATRIX'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  جدول فشرده هفتگی
                </button>
              </div>

              {calendarSubMode === 'MONTHLY' && (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={handlePrevCalMonth}
                    className="p-1 hover:bg-white rounded-lg text-gray-600 cursor-pointer"
                    title="ماه قبل"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-extrabold text-emerald-950 px-1.5 min-w-[90px] text-center">
                    {PERSIAN_MONTHS[calMonth - 1]} {toPersianDigits(calYear)}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextCalMonth}
                    className="p-1 hover:bg-white rounded-lg text-gray-600 cursor-pointer"
                    title="ماه بعد"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {(calYear !== today.year || calMonth !== today.month) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCalYear(today.year);
                        setCalMonth(today.month);
                        setSelectedCalDateStr(todayStr);
                      }}
                      className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      امروز
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {calendarSubMode === 'MONTHLY' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Monthly Compact Grid (7 cols) */}
              <div className="lg:col-span-7 space-y-1.5">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-500">
                  {WEEKDAYS_SHORT.map((w, idx) => (
                    <div
                      key={w}
                      className={`py-1 rounded-md ${idx === 6 ? 'text-rose-600 bg-rose-50/60' : 'bg-gray-50'}`}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {monthlyCalendarCells.map(cell => {
                    if (cell.empty) {
                      return <div key={cell.key} className="h-12 sm:h-14 rounded-xl bg-transparent" />;
                    }

                    const doneCount = cell.completedHabits?.length || 0;
                    const dueCount = Math.max(doneCount, cell.dueHabitsCount || 0);
                    const ratio = dueCount > 0 ? doneCount / dueCount : 0;

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => cell.dateStr && setSelectedCalDateStr(cell.dateStr)}
                        className={`h-12 sm:h-14 rounded-xl p-1 flex flex-col items-center justify-between border transition-all cursor-pointer relative select-none ${
                          cell.isSelected
                            ? 'ring-2 ring-emerald-500 border-emerald-600 bg-emerald-50/90'
                            : ratio >= 1 && doneCount > 0
                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                            : doneCount > 0
                            ? 'bg-emerald-100/90 text-emerald-950 border-emerald-300 hover:bg-emerald-200/80'
                            : cell.isToday
                            ? 'bg-amber-50/80 text-gray-900 border-amber-400'
                            : cell.isHoliday
                            ? 'bg-rose-50/40 text-rose-700 border-rose-200/70 hover:bg-rose-50'
                            : 'bg-white text-gray-700 border-gray-200/80 hover:bg-gray-50'
                        }`}
                        title={`${cell.dateStr}: ${toPersianDigits(doneCount)} از ${toPersianDigits(dueCount)} عادت انجام شده`}
                      >
                        <div className="flex items-center justify-between w-full px-0.5">
                          <span
                            className={`text-[11px] font-extrabold leading-none ${
                              ratio >= 1 && doneCount > 0 && !cell.isSelected
                                ? 'text-white'
                                : cell.isHoliday
                                ? 'text-rose-600'
                                : 'text-gray-800'
                            }`}
                          >
                            {toPersianDigits(cell.day)}
                          </span>
                          {cell.isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="امروز" />
                          )}
                        </div>

                        {/* Dots for completed habits */}
                        <div className="flex items-center justify-center gap-0.5 flex-wrap max-w-full overflow-hidden">
                          {doneCount > 0 ? (
                            cell.completedHabits!.slice(0, 4).map(ch => {
                              const cCat = getCategory(ch.categoryId);
                              return (
                                <span
                                  key={ch.id}
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      ratio >= 1 && !cell.isSelected
                                        ? '#ffffff'
                                        : cCat?.colorHex || '#059669',
                                  }}
                                />
                              );
                            })
                          ) : (
                            <span className="text-[9px] opacity-40">-</span>
                          )}
                        </div>

                        {/* Compact Counter */}
                        <span
                          className={`text-[9px] font-mono font-bold leading-none ${
                            ratio >= 1 && doneCount > 0 && !cell.isSelected
                              ? 'text-emerald-50'
                              : doneCount > 0
                              ? 'text-emerald-800'
                              : 'text-gray-400'
                          }`}
                        >
                          {toPersianDigits(doneCount)}/{toPersianDigits(dueCount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Compact Habit Checklist (5 cols) */}
              <div className="lg:col-span-5 bg-gray-50/80 rounded-2xl border border-gray-200/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-900">
                      عادت‌های {WEEKDAYS[selectedCalDow]} {toPersianDigits(selectedCalParsed.day)} {PERSIAN_MONTHS[selectedCalParsed.month - 1]}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      برای ثبت یا لغو انجام هر عادت در این تاریخ کلیک کنید
                    </p>
                  </div>
                  {selectedCalDateStr === todayStr && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      امروز
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {filteredHabits.map(h => {
                    const isDoneOnSelected = Boolean(h.completionHistory?.[selectedCalDateStr]);
                    const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                    const isScheduledOnSelected = targetDays.includes(selectedCalDow);
                    const cat = getCategory(h.categoryId);

                    return (
                      <div
                        key={h.id}
                        onClick={() => onToggleHabitDate(h.id, selectedCalDateStr)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all select-none ${
                          isDoneOnSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : isScheduledOnSelected
                            ? 'bg-white text-gray-800 border-gray-200 hover:border-emerald-300'
                            : 'bg-gray-100/70 text-gray-500 border-gray-200/60 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-0.5 rounded-lg shrink-0 ${isDoneOnSelected ? 'bg-white/20' : 'bg-emerald-50'}`}>
                            <PlantIcon type={h.plantType} size="xs" />
                          </div>
                          <span className="text-xs font-bold truncate">{h.title}</span>
                          {cat && !isDoneOnSelected && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0"
                              style={{ backgroundColor: `${cat.colorHex}18`, color: cat.colorHex }}
                            >
                              {cat.title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isScheduledOnSelected && !isDoneOnSelected && (
                            <span className="text-[9px] opacity-75">غیرموعد</span>
                          )}
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                              isDoneOnSelected
                                ? 'bg-white text-emerald-700 border-white'
                                : 'border-gray-300 bg-gray-50'
                            }`}
                          >
                            {isDoneOnSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Compact 7-Day Matrix Table of All Habits */
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 px-2 text-right font-bold min-w-[140px]">عنوان عادت</th>
                    {currentWeekDays.map(day => (
                      <th
                        key={day.dateStr}
                        className={`py-2 px-1 text-center font-bold min-w-[42px] rounded-t-lg ${
                          day.isToday
                            ? 'bg-emerald-50 text-emerald-900'
                            : day.holiday.isHoliday
                            ? 'text-rose-600'
                            : ''
                        }`}
                      >
                        <div className="text-[10px]">{WEEKDAYS_SHORT[day.dIdx]}</div>
                        <div className="text-[11px] font-mono">{toPersianDigits(day.date.day)}</div>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-center font-bold">هفته</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHabits.map(h => {
                    const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
                    const weekDoneCount = currentWeekDays.filter(d => h.completionHistory?.[d.dateStr]).length;
                    return (
                      <tr key={h.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2 px-2 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <PlantIcon type={h.plantType} size="xs" />
                            <span className="truncate max-w-[160px]">{h.title}</span>
                          </div>
                        </td>
                        {currentWeekDays.map(day => {
                          const isDone = Boolean(h.completionHistory?.[day.dateStr]);
                          const isSched = targetDays.includes(day.dIdx);
                          return (
                            <td
                              key={day.dateStr}
                              className={`py-1.5 px-1 text-center ${day.isToday ? 'bg-emerald-50/40' : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() => onToggleHabitDate(h.id, day.dateStr)}
                                className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                    : isSched
                                    ? 'bg-white text-gray-400 border-gray-200 hover:border-emerald-400'
                                    : 'bg-gray-50 text-gray-300 border-dashed border-gray-200 hover:border-gray-300'
                                }`}
                                title={`${h.title} - ${WEEKDAYS[day.dIdx]} ${toPersianDigits(day.date.day)}`}
                              >
                                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="text-[9px]">•</span>}
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-800">
                          {toPersianDigits(weekDoneCount)}/{toPersianDigits(targetDays.length)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Habit Cards */}
      {filteredHabits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-xs text-gray-500 space-y-2">
          <p>هیچ عادتی با این فیلتر یافت نشد.</p>
          <button
            type="button"
            onClick={onNewHabit}
            className="text-emerald-700 font-bold hover:underline"
          >
            تعریف عادت جدید
          </button>
        </div>
      ) : displayMode !== 'CALENDAR_ONLY' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredHabits.map((h) => {
            const cat = getCategory(h.categoryId);
            const goal = getGoal(h.goalId);
            const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
            const isEveryday = targetDays.length === 7;
            const isDueToday = targetDays.includes(todayDayOfWeek);
            const isDoneToday = !!h.completionHistory?.[todayStr];
            const nextDayName = getNextScheduledDayName(targetDays);

            return (
              <div
                key={h.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                  isDoneToday
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isDueToday
                    ? 'border-emerald-300 ring-1 ring-emerald-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Top: Icon, Title, Plant, Badges */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1 rounded-xl bg-emerald-50 border border-emerald-100 shrink-0">
                        <PlantIcon type={h.plantType} size="md" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate leading-snug">
                          {h.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {h.isClosed && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Archive className="w-3 h-3 text-amber-700" />
                              <span>بسته‌شده {h.closedAt ? `(${toPersianDigits(h.closedAt)})` : ''}</span>
                            </span>
                          )}

                          {cat && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: `${cat.colorHex}15`,
                                color: cat.colorHex,
                                borderColor: `${cat.colorHex}30`,
                              }}
                            >
                              {cat.title}
                            </span>
                          )}

                          {goal && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                              {goal.period === 'ANNUAL' ? (
                                <>
                                  <span>🎯 هدف سالانه: {goal.title}</span>
                                  <span className="text-[9px] text-emerald-600 font-normal hidden sm:inline">(جاری در همه فصول)</span>
                                </>
                              ) : (
                                <>
                                  <span>{SEASON_ICONS[goal.seasonIndex ?? 0]} هدف {SEASONS[goal.seasonIndex ?? 0]}: {goal.title}</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Focus history modal */}
                      <button
                        type="button"
                        onClick={() => setFocusHistoryHabit(h)}
                        title="مشاهده تاریخچه ساعت شنی تمرکز"
                        className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {onToggleCloseHabit && (
                        <button
                          type="button"
                          onClick={() => onToggleCloseHabit(h.id)}
                          title={h.isClosed ? 'بازگشایی مجدد عادت' : 'بستن عادت (بایگانی با حفظ تاریخچه)'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            h.isClosed
                              ? 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                              : 'text-gray-400 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDuplicateHabit && (
                        <button
                          type="button"
                          onClick={() => onDuplicateHabit(h)}
                          title="کپی از این عادت"
                          className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditHabit(h)}
                        title="ویرایش عادت"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHabit(h.id)}
                        title="حذف عادت"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {h.notes && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {h.notes}
                    </p>
                  )}
                </div>

                {/* Middle: Frequency & Scheduled Days Indicator */}
                <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>تناوب تکرار:</span>
                      <strong className="text-gray-900 font-bold">
                        {isEveryday ? 'روزانه (هر روز)' : `هفتگی (${toPersianDigits(targetDays.length)} روز در هفته)`}
                      </strong>
                    </span>

                    {/* Today Status Pill - Without any 'Rest' label */}
                    {isDueToday ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span>برنامه امروز</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        موعد بعدی: {nextDayName}
                      </span>
                    )}
                  </div>

                  {/* Interactive Weekday Buttons for Current Week */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                      <span>روزهای این هفته (برای ثبت یا لغو کلیک کنید):</span>
                      <button
                        type="button"
                        onClick={() => setExpandedGrid(prev => ({ ...prev, [h.id]: !prev[h.id] }))}
                        className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <History className="w-3 h-3" />
                        <span>{expandedGrid[h.id] ? 'بستن تاریخچه' : 'شبکه ۲۸ روز'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {[0, 1, 2, 3, 4, 5, 6].map((dIdx) => {
                        const offset = dIdx - todayDayOfWeek;
                        const d = addDaysJalali(today, offset);
                        const dateStr = jalaliToFormattedString(d);
                        const isDone = Boolean(h.completionHistory?.[dateStr]);
                        const isScheduled = targetDays.includes(dIdx);
                        const isToday = dIdx === todayDayOfWeek;
                        const hol = isDateHoliday(d);
                        const isHol = hol.isHoliday;

                        return (
                          <button
                            key={dIdx}
                            type="button"
                            onClick={() => onToggleHabitDate(h.id, dateStr)}
                            className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all relative flex flex-col items-center justify-center gap-0.5 cursor-pointer border select-none ${
                              isDone
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs hover:bg-emerald-700'
                                : isToday
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                : isHol
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : isScheduled
                                ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                : 'bg-gray-100/70 text-gray-400 border-gray-200/50 hover:bg-gray-100'
                            }`}
                            title={`${WEEKDAYS[dIdx]} (${dateStr})${isHol ? ` (تعطیل رسمی: ${hol.title})` : ''} - ${isDone ? 'انجام شده (کلیک برای لغو)' : 'برای ثبت انجام کلیک کنید'}`}
                          >
                            <span className={`text-[10px] ${isHol && !isDone ? 'text-rose-600 font-bold' : 'opacity-75'}`}>{WEEKDAYS_SHORT[dIdx]}</span>
                            {isDone ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <span className={`text-[10px] ${isHol ? 'text-rose-700 font-bold' : 'font-medium'}`}>{toPersianDigits(d.day)}</span>
                            )}
                            {isToday && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white" title="امروز"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable 28-day contribution grid */}
                  {expandedGrid[h.id] && (
                    <HabitContributionGrid
                      habit={h}
                      onToggleDate={(dateStr) => onToggleHabitDate(h.id, dateStr)}
                    />
                  )}
                </div>

                {/* Bottom: Action buttons (Mark Done + Focus Timer) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => onToggleHabitDate(h.id, todayStr)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isDoneToday
                          ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                          : isDueToday
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {isDoneToday ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>امروز انجام شد</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 text-gray-400" />
                          <span>ثبت انجام امروز</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomDateModalHabit(h);
                        setCustomDateInput(todayStr);
                      }}
                      title="ثبت برای روزهای دیگر یا انتخاب تاریخ دلخواه"
                      className="py-2 px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                      <span>روز دیگر</span>
                    </button>
                  </div>

                  {h.timerMinutes > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const todayHol = isDateHoliday(today);
                        if (todayHol.isHoliday) {
                          const proceed = window.confirm(`توجه: امروز به دلیل «${todayHol.title}» در تقویم رسمی کشور تعطیل است.\nآیا مایل به شروع ساعت شنی تمرکز روی این عادت هستید؟`);
                          if (!proceed) return;
                        }
                        onOpenTimer(
                          h.title,
                          h.timerMinutes,
                          (elapsed, isDone) => {
                            if (isDone) onToggleHabitDate(h.id, todayStr);
                          },
                          {
                            entityType: 'HABIT',
                            habitId: h.id,
                            initialElapsedSeconds: h.dailyElapsedSeconds?.[todayStr] || 0,
                            currentProgressPercent: h.dailyProgressHistory?.[todayStr] || 0,
                          }
                        );
                      }}
                      title={`شروع ساعت شنی تمرکز (${toPersianDigits(h.timerMinutes)} دقیقه)`}
                      className="py-2 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Hourglass className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">{toPersianDigits(h.timerMinutes)} دقیقه</span>
                      {h.dailyProgressHistory?.[todayStr] ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1 rounded">
                          {toPersianDigits(h.dailyProgressHistory[todayStr])}٪
                        </span>
                      ) : null}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {/* Custom Date Logger Modal */}
      {customDateModalHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-emerald-100 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">ثبت وضعیت برای روزهای دیگر</h3>
                  <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                    «{customDateModalHabit.title}»
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomDateModalHabit(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-700 block">روزهای اخیر:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'دیروز', days: -1 },
                  { label: 'پریروز', days: -2 },
                  { label: '۳ روز پیش', days: -3 },
                ].map((preset) => {
                  const pDate = addDaysJalali(today, preset.days);
                  const pDateStr = jalaliToFormattedString(pDate);
                  const isDone = Boolean(customDateModalHabit.completionHistory?.[pDateStr]);

                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        onToggleHabitDate(customDateModalHabit.id, pDateStr);
                        setCustomDateModalHabit(null);
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-200'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] opacity-80">{toPersianDigits(pDate.day)} {WEEKDAYS_SHORT[getDayOfWeek(pDate)]}</span>
                      <span className="text-[9px] font-bold">{isDone ? '✓ انجام شد' : 'ثبت'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-gray-700 block">
                یا تاریخ دلخواه (مثلاً ۱۴۰۳/۰۷/۱۵):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="YYYY/MM/DD"
                  value={customDateInput}
                  onChange={(e) => setCustomDateInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono text-center focus:border-emerald-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customDateInput.trim()) {
                      onToggleHabitDate(customDateModalHabit.id, customDateInput.trim());
                      setCustomDateModalHabit(null);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  تغییر وضعیت
                </button>
              </div>
              {customDateModalHabit.completionHistory?.[customDateInput.trim()] && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  ✓ در حال حاضر برای این تاریخ انجام‌شده ثبت است (کلیک کنید تا لغو شود).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Focus History Modal for Habits */}
      {focusHistoryHabit && (
        <FocusHistoryModal
          isOpen={Boolean(focusHistoryHabit)}
          title={focusHistoryHabit.title}
          entityType="HABIT"
          sessions={focusHistoryHabit.focusSessions || []}
          timerTargetMinutes={focusHistoryHabit.timerMinutes || 25}
          currentElapsedSeconds={focusHistoryHabit.dailyElapsedSeconds?.[todayStr] || 0}
          currentProgressPercent={focusHistoryHabit.dailyProgressHistory?.[todayStr] || 0}
          onClose={() => setFocusHistoryHabit(null)}
          onOpenTimerNow={() => {
            const h = focusHistoryHabit;
            setFocusHistoryHabit(null);
            onOpenTimer(
              h.title,
              h.timerMinutes || 25,
              (elapsed, isDone) => {
                if (isDone) onToggleHabitDate(h.id, todayStr);
              },
              {
                entityType: 'HABIT',
                habitId: h.id,
                initialElapsedSeconds: h.dailyElapsedSeconds?.[todayStr] || 0,
                currentProgressPercent: h.dailyProgressHistory?.[todayStr] || 0,
              }
            );
          }}
        />
      )}
    </div>
  );
};
