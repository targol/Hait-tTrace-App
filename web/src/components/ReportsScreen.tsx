import React, { useState } from 'react';
import { AppTask, Habit, Goal, Category, GoalStatus } from '../types';
import { 
  getTodayJalali, 
  addDaysJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  WEEKDAYS_SHORT,
  PERSIAN_MONTHS,
  parseJalaliString,
  jalaliToGregorian
} from '../calendar/jalali';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle, 
  Flame, 
  Target, 
  Award, 
  Clock, 
  Calendar,
  Layers,
  PieChart,
  CheckCircle2,
  Circle,
  Filter
} from 'lucide-react';
import { PlantIcon } from './PlantIcon';
import { WeeklyProgressSummary } from './WeeklyProgressSummary';
import { HabitWeeklyDisciplineChart } from './HabitWeeklyDisciplineChart';
import { HabitMonthCategoryPieChart } from './HabitMonthCategoryPieChart';
import { WeeklyTrendBarChart } from './WeeklyTrendBarChart';
import { AnnualGoalsProgressChart } from './AnnualGoalsProgressChart';

interface Props {
  tasks: AppTask[];
  habits: Habit[];
  goals: Goal[];
  categories: Category[];
  onNavigateToGoals?: () => void;
}

type Timeframe = 'WEEK' | 'MONTH' | 'SEASON' | 'YEAR';

const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

export const ReportsScreen: React.FC<Props> = ({ tasks, habits, goals, categories, onNavigateToGoals }) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);
  const [timeframe, setTimeframe] = useState<Timeframe>('WEEK');
  const [goalFilter, setGoalFilter] = useState<'ALL' | 'ANNUAL' | 'INTERMEDIATE' | 'SEASONAL'>('ALL');
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<number | 'ALL'>('ALL');
  const [weeklyReportView, setWeeklyReportView] = useState<'WEEKLY_TREND' | 'HABITS_DISCIPLINE' | 'ALL_ACTIVITIES'>('WEEKLY_TREND');

  // --- Calculate Days in Timeframe ---
  const currentSeasonIndex = Math.floor((today.month - 1) / 3);

  // 1. Generate Trend Data based on Timeframe
  let trendData: {
    label: string;
    subLabel?: string;
    tasksDone: number;
    habitsDone: number;
    total: number;
    isCurrent?: boolean;
  }[] = [];

  if (timeframe === 'WEEK') {
    // 7 days
    for (let i = 6; i >= 0; i--) {
      const d = addDaysJalali(today, -i);
      const dateStr = jalaliToFormattedString(d);
      const gD = jalaliToGregorian(d.year, d.month, d.day);
      const wDayIdx = (gD.getDay() + 1) % 7;
      const tasksDone = tasks.filter(t => t.isCompleted && (t.completedAt === dateStr || t.dueDate === dateStr)).length;
      const habitsDone = habits.filter(h => !!h.completionHistory[dateStr]).length;

      trendData.push({
        label: WEEKDAYS_SHORT[wDayIdx],
        subLabel: toPersianDigits(d.day),
        tasksDone,
        habitsDone,
        total: tasksDone + habitsDone,
        isCurrent: i === 0,
      });
    }
  } else if (timeframe === 'MONTH') {
    // 4 Weeks of current month
    for (let w = 1; w <= 4; w++) {
      const startDay = (w - 1) * 7 + 1;
      const endDay = Math.min(w * 7, today.month <= 6 ? 31 : 30);
      
      let wTasks = 0;
      let wHabits = 0;

      for (let d = startDay; d <= endDay; d++) {
        const mStr = today.month.toString().padStart(2, '0');
        const dStr = d.toString().padStart(2, '0');
        const dateStr = `${today.year}/${mStr}/${dStr}`;
        wTasks += tasks.filter(t => t.isCompleted && (t.completedAt === dateStr || t.dueDate === dateStr)).length;
        habits.forEach(h => {
          if (h.completionHistory[dateStr]) wHabits++;
        });
      }

      trendData.push({
        label: `هفته ${toPersianDigits(w)}`,
        subLabel: `${toPersianDigits(startDay)} تا ${toPersianDigits(endDay)}`,
        tasksDone: wTasks,
        habitsDone: wHabits,
        total: wTasks + wHabits,
        isCurrent: today.day >= startDay && today.day <= endDay,
      });
    }
  } else if (timeframe === 'SEASON') {
    // 3 months of current season
    const startMonth = currentSeasonIndex * 3 + 1;
    for (let m = startMonth; m < startMonth + 3; m++) {
      let mTasks = 0;
      let mHabits = 0;

      const mPrefix = `${today.year}/${m.toString().padStart(2, '0')}`;
      tasks.forEach(t => {
        if (t.isCompleted && (t.completedAt?.startsWith(mPrefix) || t.dueDate?.startsWith(mPrefix))) {
          mTasks++;
        }
      });
      habits.forEach(h => {
        Object.keys(h.completionHistory).forEach(dKey => {
          if (dKey.startsWith(mPrefix) && h.completionHistory[dKey]) {
            mHabits++;
          }
        });
      });

      trendData.push({
        label: PERSIAN_MONTHS[m - 1],
        subLabel: `فصل ${SEASONS[currentSeasonIndex]}`,
        tasksDone: mTasks,
        habitsDone: mHabits,
        total: mTasks + mHabits,
        isCurrent: today.month === m,
      });
    }
  } else if (timeframe === 'YEAR') {
    // 12 months of year
    for (let m = 1; m <= 12; m++) {
      let mTasks = 0;
      let mHabits = 0;

      const mPrefix = `${today.year}/${m.toString().padStart(2, '0')}`;
      tasks.forEach(t => {
        if (t.isCompleted && (t.completedAt?.startsWith(mPrefix) || t.dueDate?.startsWith(mPrefix))) {
          mTasks++;
        }
      });
      habits.forEach(h => {
        Object.keys(h.completionHistory).forEach(dKey => {
          if (dKey.startsWith(mPrefix) && h.completionHistory[dKey]) {
            mHabits++;
          }
        });
      });

      trendData.push({
        label: PERSIAN_MONTHS[m - 1],
        subLabel: toPersianDigits(m),
        tasksDone: mTasks,
        habitsDone: mHabits,
        total: mTasks + mHabits,
        isCurrent: today.month === m,
      });
    }
  }

  const maxTrendTotal = Math.max(...trendData.map(d => d.total), 1);

  // --- Calculate Goal Achievement Percentage ---
  const calculateGoalMetrics = (goal: Goal) => {
    // If user has set manual progress
    if (goal.isManualProgressActive && goal.manualProgress !== undefined && goal.manualProgress !== null) {
      return {
        percent: Math.max(0, Math.min(100, goal.manualProgress)),
        completedTasks: 0,
        totalTasks: 0,
        linkedHabitsCount: 0,
        habitChecks: 0,
        tasks: [],
      };
    }

    // A goal for a future season or future month that has not arrived yet should not score automatically
    const goalYear = goal.year || today.year;
    const currentSeasonIdx = Math.floor((today.month - 1) / 3);
    const isFutureYear = goalYear > today.year;
    const isFutureSeason = goalYear === today.year && goal.period === 'SEASONAL' && goal.seasonIndex !== undefined && goal.seasonIndex > currentSeasonIdx;
    const isFutureMonth = goalYear === today.year && goal.period === 'MONTHLY' && goal.monthIndex !== undefined && goal.monthIndex > today.month;

    if ((isFutureYear || isFutureSeason || isFutureMonth) && goal.status !== 'COMPLETED') {
      return {
        percent: 0,
        completedTasks: 0,
        totalTasks: 0,
        linkedHabitsCount: 0,
        habitChecks: 0,
        tasks: [],
      };
    }

    // Collect all sub-goal IDs
    const childGoals = goals.filter(g => g.parentId === goal.id);
    const relevantGoalIds = [goal.id, ...childGoals.map(c => c.id)];

    const linkedTasks = tasks.filter(t => t.goalId && relevantGoalIds.includes(t.goalId));
    const linkedHabits = habits.filter(h => h.goalId && relevantGoalIds.includes(h.goalId));

    const totalLinkedTasks = linkedTasks.length;
    const completedLinkedTasks = linkedTasks.filter(t => t.isCompleted).length;

    let totalHabitChecks = 0;
    linkedHabits.forEach(h => {
      const historyEntries = Object.entries(h.completionHistory || {});
      historyEntries.forEach(([dateStr, isDone]) => {
        if (!isDone) return;
        const parsed = parseJalaliString(dateStr);
        if (!parsed) return;

        if (goal.year && parsed.year !== goal.year) return;
        if (goal.period === 'SEASONAL' && goal.seasonIndex !== undefined) {
          const startM = goal.seasonIndex * 3 + 1;
          const endM = startM + 2;
          if (parsed.month < startM || parsed.month > endM) return;
        }
        if (goal.period === 'MONTHLY' && goal.monthIndex !== undefined) {
          if (parsed.month !== goal.monthIndex) return;
        }
        totalHabitChecks++;
      });
    });

    if (totalLinkedTasks === 0 && linkedHabits.length === 0) {
      return {
        percent: goal.status === 'COMPLETED' ? 100 : 0,
        completedTasks: 0,
        totalTasks: 0,
        linkedHabitsCount: 0,
        habitChecks: 0,
        tasks: linkedTasks,
      };
    }

    let score = 0;
    let maxScore = 0;

    if (totalLinkedTasks > 0) {
      score += (completedLinkedTasks / totalLinkedTasks) * 70;
      maxScore += 70;
    }

    if (linkedHabits.length > 0) {
      const habitPortion = Math.min(1, totalHabitChecks / (linkedHabits.length * 15));
      score += habitPortion * 30;
      maxScore += 30;
    }

    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return {
      percent: goal.status === 'COMPLETED' ? 100 : percent,
      completedTasks: completedLinkedTasks,
      totalTasks: totalLinkedTasks,
      linkedHabitsCount: linkedHabits.length,
      habitChecks: totalHabitChecks,
      tasks: linkedTasks,
    };
  };

  // Filtered Goals
  const filteredGoals = goals.filter(g => {
    // 1. Period filter
    if (goalFilter === 'ANNUAL' && g.period !== 'ANNUAL') return false;
    if (goalFilter === 'INTERMEDIATE' && !(g.period === 'SEASONAL' || g.period === 'MONTHLY')) return false;
    if (goalFilter === 'SEASONAL' && g.period !== 'SEASONAL') return false;

    // 2. Specific season filter (بهار، تابستان، پاییز، زمستان)
    if (selectedSeasonFilter !== 'ALL') {
      if (g.period === 'SEASONAL') {
        if (g.seasonIndex !== undefined && g.seasonIndex !== null) {
          if (Number(g.seasonIndex) !== selectedSeasonFilter) return false;
        } else if (g.startDate) {
          const parsed = parseJalaliString(g.startDate);
          if (parsed) {
            const sIdx = Math.floor((parsed.month - 1) / 3);
            if (sIdx !== selectedSeasonFilter) return false;
          }
        }
      } else if (g.period === 'MONTHLY') {
        if (g.monthIndex !== undefined && g.monthIndex !== null) {
          const sIdx = Math.floor((g.monthIndex - 1) / 3);
          if (sIdx !== selectedSeasonFilter) return false;
        } else if (g.startDate) {
          const parsed = parseJalaliString(g.startDate);
          if (parsed) {
            const sIdx = Math.floor((parsed.month - 1) / 3);
            if (sIdx !== selectedSeasonFilter) return false;
          }
        }
      } else if (g.period === 'ANNUAL') {
        // If filtering strictly by a season, annual goals can be shown or excluded
        // Exclude annual goals when a specific season (0..3) is chosen
        return false;
      }
    }

    return true;
  });

  // Calculate Average Goal Completion
  const goalPercentages = goals.map(g => calculateGoalMetrics(g).percent);
  const averageGoalAchievement = goalPercentages.length > 0
    ? Math.round(goalPercentages.reduce((a, b) => a + b, 0) / goalPercentages.length)
    : 0;

  // --- Task Breakdown by Category ---
  const taskCategoryStats = categories.map(cat => {
    const catTasks = tasks.filter(t => t.categoryId === cat.id);
    const catCompleted = catTasks.filter(t => t.isCompleted).length;
    const rate = catTasks.length > 0 ? Math.round((catCompleted / catTasks.length) * 100) : 0;
    return {
      category: cat,
      total: catTasks.length,
      completed: catCompleted,
      rate,
    };
  }).filter(s => s.total > 0);

  // Overall Task Completion
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Habit Consistency in selected timeframe
  const habitStats = habits.map(h => {
    let checks = 0;
    let daysCount = timeframe === 'WEEK' ? 7 : timeframe === 'MONTH' ? 30 : timeframe === 'SEASON' ? 90 : 365;

    for (let i = 0; i < daysCount; i++) {
      const dStr = jalaliToFormattedString(addDaysJalali(today, -i));
      if (h.completionHistory[dStr]) checks++;
    }

    const rate = Math.min(100, Math.round((checks / daysCount) * 100));
    return { habit: h, checks, daysCount, rate };
  }).sort((a, b) => b.rate - a.rate);

  // Focus Minutes
  const totalFocusSeconds = tasks.reduce((sum, t) => sum + (t.timerSecondsElapsed || 0), 0);
  const totalFocusMinutes = Math.round(totalFocusSeconds / 60);

  const getCategory = (catId?: string) => categories.find(c => c.id === catId);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Timeframe Switcher */}
      <div className="sticky -top-5 z-20 pt-5 pb-2.5 bg-[#F8F9F5]/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>گزارش‌ها و تحلیل روند پیشرفت</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            بررسی دسته‌بندی‌ها، عملکرد تسک‌ها و درصد دقیق تحقق اهداف
          </p>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-emerald-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTimeframe('WEEK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'WEEK'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-800'
            }`}
          >
            هفته جاری
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('MONTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'MONTH'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-800'
            }`}
          >
            ماه جاری
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('SEASON')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'SEASON'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-800'
            }`}
          >
            فصل {SEASONS[currentSeasonIndex]}
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('YEAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'YEAR'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-800'
            }`}
          >
            سال {toPersianDigits(today.year)}
          </button>
        </div>
      </div>

      {/* Overview Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>تحقق اهداف</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-950">
            {toPersianDigits(averageGoalAchievement)}٪
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            میانگین دستیابی به {toPersianDigits(goals.length)} هدف
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>تکمیل تسک‌ها</span>
            <CheckCircle className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-950">
            {toPersianDigits(taskCompletionRate)}٪
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {toPersianDigits(completedTasks)} از {toPersianDigits(totalTasks)} تسک
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>پایبندی عادات</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-950">
            {toPersianDigits(habitStats[0]?.rate || 0)}٪
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            بالاترین استمرار در بازه
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>زمان تمرکز ثبت‌شده</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-950">
            {toPersianDigits(totalFocusMinutes)} <span className="text-xs font-normal">دقیقه</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            با جلسات پومودورو
          </p>
        </div>
      </div>

      {/* Weekly Progress Summary Component */}
      {timeframe === 'WEEK' ? (
        <div className="space-y-4">
          {/* Sub-view switcher between Weekly Trend Bar Chart, Habit Discipline, and Full Activity Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-emerald-100 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setWeeklyReportView('WEEKLY_TREND')}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  weeklyReportView === 'WEEKLY_TREND'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/60'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-300" />
                <span>نمودار میله‌ای تسک‌ها و عادت‌های هفته</span>
              </button>
              <button
                type="button"
                onClick={() => setWeeklyReportView('HABITS_DISCIPLINE')}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  weeklyReportView === 'HABITS_DISCIPLINE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/60'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>انضباط و جزئیات عادات</span>
              </button>
              <button
                type="button"
                onClick={() => setWeeklyReportView('ALL_ACTIVITIES')}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  weeklyReportView === 'ALL_ACTIVITIES'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/60'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <span>خلاصه جامع پیشرفت</span>
              </button>
            </div>
            
            <div className="text-[11px] text-gray-500 font-medium px-2 hidden sm:block">
              {weeklyReportView === 'WEEKLY_TREND' 
                ? 'نمودار ستونی تعداد تسک‌ها و عادات تکمیل‌شده بر اساس روزهای تقویم شمسی'
                : weeklyReportView === 'HABITS_DISCIPLINE'
                ? 'نمودار ستونی میزان تکمیل عادات به تفکیک هر روز هفته'
                : 'گزارش تفکیکی فعالیت‌های تسک و عادت‌ها'
              }
            </div>
          </div>

          {weeklyReportView === 'WEEKLY_TREND' ? (
            <WeeklyTrendBarChart tasks={tasks} habits={habits} />
          ) : weeklyReportView === 'HABITS_DISCIPLINE' ? (
            <HabitWeeklyDisciplineChart habits={habits} tasks={tasks} categories={categories} />
          ) : (
            <WeeklyProgressSummary 
              tasks={tasks} 
              habits={habits} 
              categories={categories} 
              goals={goals} 
            />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>
                  روند فعالیت‌ها ({timeframe === 'MONTH' ? 'ماه جاری' : timeframe === 'SEASON' ? 'فصل جاری' : 'سال جاری'})
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                مجموع تسک‌ها و عادت‌های انجام شده در هر بازه
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>تسک</span>
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>عادت</span>
              </span>
            </div>
          </div>

          {/* Chart columns */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 overflow-x-auto no-scrollbar">
            {trendData.map((d, idx) => {
              const heightPercent = Math.max(8, Math.round((d.total / maxTrendTotal) * 100));
              return (
                <div key={idx} className="flex-1 min-w-[32px] flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] text-emerald-800 font-bold">
                    {toPersianDigits(d.total)}
                  </span>
                  <div
                    className={`w-full max-w-[36px] rounded-t-xl transition-all duration-500 flex flex-col justify-end overflow-hidden ${
                      d.isCurrent ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Habit slice */}
                    <div
                      className="bg-amber-400 transition-all"
                      style={{ height: `${d.total > 0 ? (d.habitsDone / d.total) * 100 : 0}%` }}
                    />
                    {/* Task slice */}
                    <div
                      className="bg-emerald-600 transition-all"
                      style={{ height: `${d.total > 0 ? (d.tasksDone / d.total) * 100 : 100}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <span className={`block text-[11px] font-medium truncate ${d.isCurrent ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                      {d.label}
                    </span>
                    {d.subLabel && (
                      <span className="block text-[9px] text-gray-400 truncate">
                        {d.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Habit Category Distribution Pie Chart (نمودار دایره‌ای توزیع عادات بر اساس دسته‌بندی در ماه جاری) */}
      <HabitMonthCategoryPieChart habits={habits} categories={categories} />

      {/* Annual Goals Progress Trend (تحلیل و نمودار روند پیشرفت اهداف سالانه - خطی و دایره‌ای) */}
      <AnnualGoalsProgressChart
        goals={goals}
        tasks={tasks}
        habits={habits}
        categories={categories}
        onNavigateToGoals={onNavigateToGoals}
      />

      {/* Goal Achievement & Progress Report (درصد رسیده به اهداف) */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>تحلیل درصد دستیابی به اهداف (Goal Achievement)</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              محاسبه دقیق درصد پیشرفت بر اساس تسک‌های خرد تکمیل‌شده و پیوستگی عادات مرتبط
            </p>
          </div>

          {/* Goal Filter */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setGoalFilter('ALL');
                setSelectedSeasonFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                goalFilter === 'ALL' && selectedSeasonFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              همه ({toPersianDigits(goals.length)})
            </button>
            <button
              type="button"
              onClick={() => {
                setGoalFilter('ANNUAL');
                setSelectedSeasonFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                goalFilter === 'ANNUAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              اهداف سالانه
            </button>
            <button
              type="button"
              onClick={() => {
                setGoalFilter('INTERMEDIATE');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                goalFilter === 'INTERMEDIATE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              اهداف میانی
            </button>

            {/* Separator */}
            <span className="h-4 w-px bg-gray-200 mx-0.5 hidden sm:inline-block" />

            {/* Season Filter Dropdown / Quick Buttons */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5 gap-0.5">
              <span className="text-[10px] text-gray-500 px-1 font-medium hidden md:inline">فصل:</span>
              <button
                type="button"
                onClick={() => setSelectedSeasonFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedSeasonFilter === 'ALL'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                همه فصول
              </button>
              {SEASONS.map((sName, sIdx) => {
                const seasonEmojis = ['🌸', '☀️', '🍂', '❄️'];
                const isSelected = selectedSeasonFilter === sIdx;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setSelectedSeasonFilter(sIdx);
                      if (goalFilter === 'ANNUAL') setGoalFilter('ALL');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-emerald-900 hover:bg-gray-100'
                    }`}
                  >
                    <span>{seasonEmojis[sIdx]}</span>
                    <span>{sName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            هدفی در این فیلتر یافت نشد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const metrics = calculateGoalMetrics(goal);
              const cat = getCategory(goal.categoryId);

              return (
                <div
                  key={goal.id}
                  className="bg-emerald-50/30 rounded-xl border border-emerald-100/90 p-4 space-y-3 flex flex-col justify-between hover:border-emerald-300 transition-colors"
                >
                  <div>
                    {/* Goal Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800">
                            {goal.period === 'ANNUAL'
                              ? `سالانه ${toPersianDigits(goal.year)}`
                              : goal.period === 'SEASONAL' && goal.seasonIndex !== undefined
                              ? `فصل ${SEASONS[goal.seasonIndex]}`
                              : `ماهانه`}
                          </span>

                          {cat && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1"
                              style={{
                                backgroundColor: `${cat.colorHex}15`,
                                color: cat.colorHex,
                                borderColor: `${cat.colorHex}30`,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                              <span>{cat.title}</span>
                            </span>
                          )}

                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mt-1.5 flex items-center gap-2">
                          {goal.plantType && <PlantIcon type={goal.plantType} size="xs" />}
                          <span>{goal.title}</span>
                        </h4>
                      </div>

                      {/* Percentage Badge */}
                      <div className="text-left shrink-0">
                        <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                          {toPersianDigits(metrics.percent)}٪
                        </span>
                        <span className="block text-[9px] text-gray-400">تحقق یافته</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="h-2 w-full bg-emerald-100/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                          style={{ width: `${metrics.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tasks & Habits Sub-Metrics */}
                  <div className="pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[11px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{toPersianDigits(metrics.completedTasks)} از {toPersianDigits(metrics.totalTasks)} تسک انجام شده</span>
                    </span>
                    {metrics.linkedHabitsCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-700">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>{toPersianDigits(metrics.habitChecks)} بار ثبت عادت</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Breakdown by Category (گزارش تفکیکی بر اساس تسک‌ها) */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>تحلیل تسک‌ها بر اساس دسته‌بندی و حوزه‌ها</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            بررسی نرخ موفقیت و تکمیل وظایف در هر بخش از زندگی یا کار
          </p>
        </div>

        <div className="space-y-3">
          {taskCategoryStats.map((stat) => (
            <div key={stat.category.id} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-900 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stat.category.colorHex }}
                  />
                  <span>{stat.category.title}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    ({toPersianDigits(stat.completed)} از {toPersianDigits(stat.total)} تسک)
                  </span>
                </span>
                <span className="font-bold text-gray-700">
                  {toPersianDigits(stat.rate)}٪
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stat.rate}%`,
                    backgroundColor: stat.category.colorHex,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Habit Consistency & Garden Mascot Ranking */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>رتبه‌بندی پایبندی به عادات و شادابی گیاهان باغچه</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              پیوستگی ثبت روزانه به تفکیک گیاهان نمادین شما در بازه {timeframe === 'WEEK' ? 'هفتگی' : timeframe === 'MONTH' ? 'ماهانه' : timeframe === 'SEASON' ? 'فصلی' : 'سالانه'}
            </p>
          </div>

          {timeframe !== 'WEEK' && (
            <button
              type="button"
              onClick={() => {
                setTimeframe('WEEK');
                setWeeklyReportView('HABITS_DISCIPLINE');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>مشاهده نمودار ستونی هفته جاری</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {habitStats.map((r, idx) => (
            <div
              key={r.habit.id}
              className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-emerald-300 transition-colors shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-200/80">
                <PlantIcon type={r.habit.plantType} size="sm" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {r.habit.title}
                  </p>
                  <span className="text-xs font-extrabold text-emerald-700">
                    {toPersianDigits(r.rate)}٪
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {toPersianDigits(r.checks)} بار ثبت در این بازه
                </p>
                <div className="h-1.5 w-full bg-emerald-50 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
                    style={{ width: `${r.rate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
