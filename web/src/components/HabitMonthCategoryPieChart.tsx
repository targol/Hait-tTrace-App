import React, { useState, useMemo, useEffect } from 'react';
import { Habit, Category } from '../types';
import { 
  getTodayJalali, 
  toPersianDigits, 
  PERSIAN_MONTHS, 
  parseJalaliString,
  addDaysJalali,
  jalaliToFormattedString,
  jalaliToGregorian,
  WEEKDAYS
} from '../calendar/jalali';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Sector 
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  ChevronRight, 
  ChevronLeft, 
  Flame, 
  Sparkles, 
  Award, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Layers,
  CheckCircle2,
  TrendingUp,
  FolderOpen
} from 'lucide-react';
import { PlantIcon } from './PlantIcon';

interface Props {
  habits: Habit[];
  categories: Category[];
  className?: string;
}

interface CategoryCompletionStat {
  categoryId: string;
  categoryTitle: string;
  colorHex: string;
  plantType?: string;
  completionsCount: number;
  distinctHabitsCount: number;
  percentage: number;
  habitsBreakdown: {
    habit: Habit;
    count: number;
  }[];
}

// Fallback palette if a category color is missing
const FALLBACK_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'
];

export const HabitMonthCategoryPieChart: React.FC<Props> = ({
  habits,
  categories,
  className = '',
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = useMemo(() => getTodayJalali(), []);

  // Period mode: 'WEEK' (میزان موفقیت عادات هفتگی) vs 'MONTH' (عادات ماهانه)
  const [periodMode, setPeriodMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Selected Jalali Year & Month (for monthly mode)
  const [selectedYear, setSelectedYear] = useState<number>(today.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.month);

  // Calculate week range for weekly mode
  const gDate = useMemo(() => jalaliToGregorian(today.year, today.month, today.day), [today]);
  const todayWeekdayIndex = (gDate.getDay() + 1) % 7; // 0: Sat ... 6: Fri
  const startOfWeek = useMemo(() => addDaysJalali(today, -todayWeekdayIndex + weekOffset * 7), [today, todayWeekdayIndex, weekOffset]);
  const endOfWeek = useMemo(() => addDaysJalali(startOfWeek, 6), [startOfWeek]);
  const weekDateStrings = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 7; i++) {
      list.push(jalaliToFormattedString(addDaysJalali(startOfWeek, i)));
    }
    return list;
  }, [startOfWeek]);

  // Active hovered or selected slice index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Expanded category ID for showing habits breakdown
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Metric mode: 'COMPLETIONS' (تعداد دفعات انجام) vs 'ACTIVE_HABITS' (تعداد عادات فعال)
  const [metricMode, setMetricMode] = useState<'COMPLETIONS' | 'ACTIVE_HABITS'>('COMPLETIONS');

  // Navigation helpers
  const isCurrentMonth = selectedYear === today.year && selectedMonth === today.month;
  const isCurrentWeek = weekOffset === 0;

  const handlePrevWeek = () => {
    setWeekOffset(prev => prev - 1);
    setActiveIndex(null);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
    setActiveIndex(null);
  };

  const handleResetToCurrentWeek = () => {
    setWeekOffset(0);
    setActiveIndex(null);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setActiveIndex(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setActiveIndex(null);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(today.year);
    setSelectedMonth(today.month);
    setActiveIndex(null);
  };

  // 1. Calculate completions for each category in the chosen period (week or month)
  const categoryStats = useMemo<CategoryCompletionStat[]>(() => {
    // Collect completions per habit in the target period
    const habitPeriodCompletions: Record<string, number> = {};

    habits.forEach((habit) => {
      let count = 0;
      if (habit.completionHistory) {
        if (periodMode === 'WEEK') {
          weekDateStrings.forEach((dStr) => {
            if (habit.completionHistory?.[dStr]) {
              count++;
            }
          });
        } else {
          Object.entries(habit.completionHistory).forEach(([dateStr, isDone]) => {
            if (!isDone) return;
            const parsed = parseJalaliString(dateStr);
            if (parsed && parsed.year === selectedYear && parsed.month === selectedMonth) {
              count++;
            }
          });
        }
      }
      habitPeriodCompletions[habit.id] = count;
    });

    // Map known categories
    const results: CategoryCompletionStat[] = [];
    const processedHabitIds = new Set<string>();

    categories.forEach((cat, index) => {
      const catHabits = habits.filter((h) => h.categoryId === cat.id);
      const habitsBreakdown: { habit: Habit; count: number }[] = [];
      let totalCatCompletions = 0;

      catHabits.forEach((h) => {
        processedHabitIds.add(h.id);
        const c = habitPeriodCompletions[h.id] || 0;
        if (c > 0) {
          habitsBreakdown.push({ habit: h, count: c });
          totalCatCompletions += c;
        }
      });

      habitsBreakdown.sort((a, b) => b.count - a.count);

      results.push({
        categoryId: cat.id,
        categoryTitle: cat.title,
        colorHex: cat.colorHex || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        plantType: cat.plantType,
        completionsCount: totalCatCompletions,
        distinctHabitsCount: habitsBreakdown.length,
        percentage: 0,
        habitsBreakdown,
      });
    });

    // Check habits that have uncategorized or deleted category
    const uncategorizedHabits = habits.filter((h) => !processedHabitIds.has(h.id));
    if (uncategorizedHabits.length > 0) {
      const habitsBreakdown: { habit: Habit; count: number }[] = [];
      let totalUncatCompletions = 0;

      uncategorizedHabits.forEach((h) => {
        const c = habitPeriodCompletions[h.id] || 0;
        if (c > 0) {
          habitsBreakdown.push({ habit: h, count: c });
          totalUncatCompletions += c;
        }
      });

      if (habitsBreakdown.length > 0) {
        habitsBreakdown.sort((a, b) => b.count - a.count);
        results.push({
          categoryId: 'uncategorized',
          categoryTitle: 'سایر / بدون دسته‌بندی',
          colorHex: '#94A3B8',
          plantType: undefined,
          completionsCount: totalUncatCompletions,
          distinctHabitsCount: habitsBreakdown.length,
          percentage: 0,
          habitsBreakdown,
        });
      }
    }

    // Filter to categories that actually have activity in the selected metric mode
    const activeResults = results.filter((r) => 
      metricMode === 'COMPLETIONS' ? r.completionsCount > 0 : r.distinctHabitsCount > 0
    );

    // Calculate total base
    const totalMetricValue = activeResults.reduce((sum, r) => 
      sum + (metricMode === 'COMPLETIONS' ? r.completionsCount : r.distinctHabitsCount), 0
    );

    activeResults.forEach((r) => {
      const val = metricMode === 'COMPLETIONS' ? r.completionsCount : r.distinctHabitsCount;
      r.percentage = totalMetricValue > 0 ? (val / totalMetricValue) * 100 : 0;
    });

    // Sort descending by value
    return activeResults.sort((a, b) => {
      const valA = metricMode === 'COMPLETIONS' ? a.completionsCount : a.distinctHabitsCount;
      const valB = metricMode === 'COMPLETIONS' ? b.completionsCount : b.distinctHabitsCount;
      return valB - valA;
    });
  }, [habits, categories, selectedYear, selectedMonth, metricMode]);

  // Aggregate metrics
  const totalCompletions = useMemo(() => {
    return categoryStats.reduce((sum, c) => sum + c.completionsCount, 0);
  }, [categoryStats]);

  const totalActiveHabits = useMemo(() => {
    return categoryStats.reduce((sum, c) => sum + c.distinctHabitsCount, 0);
  }, [categoryStats]);

  const topCategory = categoryStats[0] || null;

  // Chart dataset for Recharts Pie
  const chartData = useMemo(() => {
    return categoryStats.map((stat, idx) => ({
      index: idx,
      categoryId: stat.categoryId,
      name: stat.categoryTitle,
      value: metricMode === 'COMPLETIONS' ? stat.completionsCount : stat.distinctHabitsCount,
      percentage: stat.percentage,
      colorHex: stat.colorHex,
      plantType: stat.plantType,
      stat,
    }));
  }, [categoryStats, metricMode]);

  const currentHoveredItem = activeIndex !== null && chartData[activeIndex] ? chartData[activeIndex] : null;

  // Custom Active Shape with animated outer glow
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={6}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 14}
          fill={fill}
          opacity={0.35}
        />
      </g>
    );
  };

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    if (!item) return null;

    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-emerald-100 shadow-xl text-right dir-rtl min-w-[170px] space-y-1.5 z-50">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
          <span 
            className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
            style={{ backgroundColor: item.colorHex }} 
          />
          <span className="font-bold text-gray-900 text-xs truncate">
            {item.name}
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span>{periodMode === 'WEEK' ? 'سهم از کل هفته:' : 'سهم از ماه:'}</span>
            <span className="font-extrabold text-emerald-700">
              {toPersianDigits(item.percentage.toFixed(1))}٪
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>تعداد انجام عادات:</span>
            <span className="font-bold text-gray-900">
              {toPersianDigits(item.stat.completionsCount)} بار
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>عادات ثبت‌شده:</span>
            <span className="font-medium text-gray-700">
              {toPersianDigits(item.stat.distinctHabitsCount)} عادت
            </span>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 pt-1 text-center border-t border-gray-50">
          برای دیدن جزئیات عادات کلیک کنید
        </p>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100/90 shadow-xs space-y-6 ${className}`}>
      {/* 1. Header with Title & Period / Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                  {periodMode === 'WEEK'
                    ? 'نمودار دایره‌ای میزان موفقیت در انجام عادت‌های هفتگی به تفکیک دسته‌بندی‌ها'
                    : 'توزیع عادات انجام‌شده در ماه بر اساس دسته‌بندی'}
                </h3>
                {periodMode === 'WEEK' ? (
                  isCurrentWeek ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                      هفته جاری
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetToCurrentWeek}
                      className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                      title="بازگشت به هفته جاری"
                    >
                      بازگشت به هفته جاری
                    </button>
                  )
                ) : isCurrentMonth ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                    ماه جاری
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetToCurrentMonth}
                    className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                    title="بازگشت به ماه جاری"
                  >
                    بازگشت به ماه جاری
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {periodMode === 'WEEK'
                    ? `از شنبه ${toPersianDigits(startOfWeek.day)} ${PERSIAN_MONTHS[startOfWeek.month - 1]} تا جمعه ${toPersianDigits(endOfWeek.day)} ${PERSIAN_MONTHS[endOfWeek.month - 1]}`
                    : `تحلیل و سهم هر حوزه موضوعی در ${PERSIAN_MONTHS[selectedMonth - 1]} ${toPersianDigits(selectedYear)}`}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector (Week / Month), Metric Switch & Pager */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Period Mode: Weekly vs Monthly */}
          <div className="flex items-center bg-emerald-50/80 p-0.5 rounded-xl border border-emerald-200/90 text-xs">
            <button
              type="button"
              onClick={() => { setPeriodMode('WEEK'); setActiveIndex(null); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodMode === 'WEEK'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/50'
              }`}
            >
              هفتگی
            </button>
            <button
              type="button"
              onClick={() => { setPeriodMode('MONTH'); setActiveIndex(null); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodMode === 'MONTH'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/50'
              }`}
            >
              ماهانه
            </button>
          </div>

          {/* Metric switch */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('COMPLETIONS')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metricMode === 'COMPLETIONS'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              دفعات ثبت
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('ACTIVE_HABITS')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metricMode === 'ACTIVE_HABITS'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              تعداد عادات
            </button>
          </div>

          {/* Pager (Previous / Next for Week or Month) */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-2xs p-0.5">
            <button
              type="button"
              onClick={periodMode === 'WEEK' ? handlePrevWeek : handlePrevMonth}
              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title={periodMode === 'WEEK' ? 'هفته قبل' : 'ماه قبل'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-gray-800 min-w-[76px] text-center">
              {periodMode === 'WEEK'
                ? (weekOffset === 0 ? 'این هفته' : weekOffset < 0 ? `${toPersianDigits(Math.abs(weekOffset))} هفته قبل` : `${toPersianDigits(weekOffset)} هفته بعد`)
                : PERSIAN_MONTHS[selectedMonth - 1]}
            </span>
            <button
              type="button"
              onClick={periodMode === 'WEEK' ? handleNextWeek : handleNextMonth}
              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title={periodMode === 'WEEK' ? 'هفته بعد' : 'ماه بعد'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Completions */}
        <div className="bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
            <span className="font-semibold">{periodMode === 'WEEK' ? 'کل ثبت‌های هفته' : 'کل ثبت‌های ماه'}</span>
            <Flame className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {toPersianDigits(totalCompletions)} <span className="text-xs font-normal text-emerald-700">بار</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-1">
            در ماه {PERSIAN_MONTHS[selectedMonth - 1]}
          </p>
        </div>

        {/* Metric 2: Active Categories */}
        <div className="bg-teal-50/50 rounded-2xl p-3.5 border border-teal-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-teal-800 mb-1">
            <span className="font-semibold">دسته‌های فعال</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-950 font-mono">
            {toPersianDigits(categoryStats.length)} <span className="text-xs font-normal text-teal-700">حوزه</span>
          </div>
          <p className="text-[11px] text-teal-700/80 mt-1">
            از {toPersianDigits(categories.length)} دسته تعریف‌شده
          </p>
        </div>

        {/* Metric 3: Active Habits */}
        <div className="bg-amber-50/50 rounded-2xl p-3.5 border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span className="font-semibold">عادات انجام‌شده</span>
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {toPersianDigits(totalActiveHabits)} <span className="text-xs font-normal text-amber-700">عادت</span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">
            با حداقل یک‌بار ثبت موفق
          </p>
        </div>

        {/* Metric 4: Top Category */}
        <div className="bg-indigo-50/50 rounded-2xl p-3.5 border border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-800 mb-1">
            <span className="font-semibold">حوزه پیشرو</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base font-extrabold text-indigo-950 truncate">
            {topCategory ? topCategory.categoryTitle : '—'}
          </div>
          <p className="text-[11px] text-indigo-700/80 mt-1 truncate">
            {topCategory 
              ? `${toPersianDigits(topCategory.percentage.toFixed(0))}٪ از فعالیت‌های ماه`
              : 'ثبتی انجام نشده'
            }
          </p>
        </div>
      </div>

      {/* 3. Main Chart & Legend Section */}
      {categoryStats.length === 0 ? (
        /* Empty State */
        <div className="bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200 p-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
            <PieChartIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-800">
              هنوز عادتی در ماه {PERSIAN_MONTHS[selectedMonth - 1]} ثبت نشده است
            </h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              با ثبت روزانه عادات در تب «امروز» یا «عادت‌ها»، توزیع درصد هر دسته‌بندی به‌صورت نمودار دایره‌ای زیبا در این بخش نمایش داده خواهد شد.
            </p>
          </div>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={handleResetToCurrentMonth}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <span>مشاهده آمار ماه جاری ({PERSIAN_MONTHS[today.month - 1]})</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Pie / Donut Chart Column */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="h-64 sm:h-72 w-full max-w-[320px] relative">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={105}
                      paddingAngle={chartData.length > 1 ? 4 : 0}
                      cornerRadius={6}
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      activeIndex={activeIndex !== null ? activeIndex : undefined}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={(_, index) => {
                        const clicked = chartData[index];
                        if (clicked) {
                          setExpandedCategoryId(
                            expandedCategoryId === clicked.categoryId ? null : clicked.categoryId
                          );
                        }
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.categoryId}-${index}`}
                          fill={entry.colorHex}
                          className="transition-all duration-300 cursor-pointer outline-none"
                          style={{
                            filter: activeIndex === index ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))' : 'none',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {currentHoveredItem ? (
                  <div className="animate-fade-in space-y-0.5">
                    <span className="text-[11px] font-bold text-gray-500 block truncate max-w-[120px]">
                      {currentHoveredItem.name}
                    </span>
                    <span 
                      className="text-2xl font-black font-mono block"
                      style={{ color: currentHoveredItem.colorHex }}
                    >
                      {toPersianDigits(currentHoveredItem.value)}
                    </span>
                    <span className="text-[11px] font-bold text-gray-600 block">
                      {toPersianDigits(currentHoveredItem.percentage.toFixed(1))}٪ از ماه
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-emerald-950 font-mono block">
                      {toPersianDigits(metricMode === 'COMPLETIONS' ? totalCompletions : totalActiveHabits)}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 block">
                      {metricMode === 'COMPLETIONS' ? 'بار ثبت عادت' : 'عادت انجام‌شده'}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {PERSIAN_MONTHS[selectedMonth - 1]} {toPersianDigits(selectedYear)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-gray-400 text-center mt-1">
              روی هر برش کلیک کنید تا جزئیات عادات آن دسته‌بندی باز شود
            </div>
          </div>

          {/* Category Breakdown & Habit Detail Cards */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-1 pb-1 border-b border-gray-100">
              <span>دسته‌بندی و سهم درصدی</span>
              <span>تعداد ثبت و عادات</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 -mr-1">
              {categoryStats.map((stat, idx) => {
                const isHovered = activeIndex === idx;
                const isExpanded = expandedCategoryId === stat.categoryId;

                return (
                  <div
                    key={stat.categoryId}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isHovered
                        ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                        : 'border-gray-200/90 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedCategoryId(isExpanded ? null : stat.categoryId)}
                      className="p-3 cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Swatch */}
                        <div
                          className="w-3.5 h-3.5 rounded-lg shrink-0 shadow-2xs"
                          style={{ backgroundColor: stat.colorHex }}
                        />

                        {/* Title and Badge */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                              {stat.categoryTitle}
                            </span>
                            {stat.plantType && (
                              <div className="hidden sm:inline-block shrink-0">
                                <PlantIcon type={stat.plantType} size="xs" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {toPersianDigits(stat.distinctHabitsCount)} عادت فعال
                          </span>
                        </div>
                      </div>

                      {/* Right Metrics */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-left">
                          <span className="text-sm font-extrabold text-gray-900 font-mono">
                            {toPersianDigits(stat.completionsCount)} <span className="text-[10px] font-normal text-gray-500">بار</span>
                          </span>
                          <span 
                            className="block text-[11px] font-bold"
                            style={{ color: stat.colorHex }}
                          >
                            {toPersianDigits(stat.percentage.toFixed(1))}٪
                          </span>
                        </div>

                        <div className="text-gray-400 p-1 hover:text-gray-600 transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for Category Share */}
                    <div className="px-3 pb-2">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(3, stat.percentage)}%`,
                            backgroundColor: stat.colorHex,
                          }}
                        />
                      </div>
                    </div>

                    {/* Expandable Drilldown for Habits inside this Category */}
                    {isExpanded && (
                      <div className="bg-gray-50/80 border-t border-gray-100 px-3 py-2.5 space-y-2 animate-fade-in text-xs">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold border-b border-gray-200/60 pb-1">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                            <span>عادات زیرمجموعه {stat.categoryTitle}</span>
                          </span>
                          <span>دفعات انجام</span>
                        </div>

                        {stat.habitsBreakdown.length === 0 ? (
                          <div className="text-gray-400 text-center py-1 text-[11px]">
                            عادی در این بازه ثبت نشده است.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {stat.habitsBreakdown.map(({ habit, count }) => {
                              const habitShareInCat = stat.completionsCount > 0
                                ? Math.round((count / stat.completionsCount) * 100)
                                : 0;

                              return (
                                <div
                                  key={habit.id}
                                  className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-xl border border-gray-200/60"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <PlantIcon type={habit.plantType} size="xs" />
                                    <div className="min-w-0">
                                      <span className="font-bold text-gray-800 truncate block text-[11px] sm:text-xs">
                                        {habit.title}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        {toPersianDigits(habitShareInCat)}٪ از سهم این دسته
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg text-xs shrink-0 font-mono">
                                    <span>{toPersianDigits(count)}</span>
                                    <span className="text-[10px] font-normal text-emerald-600">بار</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Insight Tip Banner */}
      {categoryStats.length > 0 && topCategory && (
        <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/60 rounded-2xl p-3.5 border border-emerald-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4 text-emerald-100" />
          </div>
          <div className="text-xs text-gray-700 leading-relaxed">
            <span className="font-bold text-emerald-900">بینش ماهانه: </span>
            دسته‌بندی <span className="font-bold text-emerald-800">«{topCategory.categoryTitle}»</span> با <span className="font-bold text-emerald-900">{toPersianDigits(topCategory.completionsCount)} بار ثبت</span> و سهم <span className="font-bold text-emerald-900">{toPersianDigits(topCategory.percentage.toFixed(0))}٪</span> بیشترین تمرکز شما در ماه {PERSIAN_MONTHS[selectedMonth - 1]} بوده است.
            {categoryStats.length > 1 && (
              <span className="text-gray-500 mr-1">
                توزیع عادات در {toPersianDigits(categoryStats.length)} حوزه موضوعی مختلف به حفظ تعادل و رشد همه‌جانبه شما کمک می‌کند.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
