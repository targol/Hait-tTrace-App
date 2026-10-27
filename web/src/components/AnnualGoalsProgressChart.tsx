import React, { useState, useMemo, useEffect } from 'react';
import { Goal, AppTask, Habit, Category, GoalPeriod } from '../types';
import { 
  getTodayJalali, 
  toPersianDigits, 
  PERSIAN_MONTHS, 
  parseJalaliString,
  addDaysJalali,
  jalaliToFormattedString
} from '../calendar/jalali';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';
import {
  Target,
  TrendingUp,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  Layers,
  Flame,
  ArrowUpRight,
  HelpCircle,
  Compass
} from 'lucide-react';
import { PlantIcon } from './PlantIcon';
import { getBotanicalStageFromPercent } from '../utils/gardenCalculations';

interface Props {
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  categories: Category[];
  className?: string;
  onNavigateToGoals?: () => void;
}

type ChartViewMode = 'LINEAR' | 'CIRCULAR';
type CircularBreakdownMode = 'STATUS_TIERS' | 'CATEGORIES' | 'INDIVIDUAL_GOALS';

const PALETTE = [
  '#059669', // Emerald
  '#2563EB', // Blue
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DC2626', // Red
  '#0D9488', // Teal
  '#DB2777', // Pink
  '#4F46E5', // Indigo
];

export const AnnualGoalsProgressChart: React.FC<Props> = ({
  goals,
  tasks,
  habits,
  categories,
  className = '',
  onNavigateToGoals
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = useMemo(() => getTodayJalali(), []);
  
  // Available years from existing goals
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(today.year);
    goals.forEach(g => {
      if (g.year) yearSet.add(g.year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [goals, today.year]);

  const [selectedYear, setSelectedYear] = useState<number>(today.year);
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('LINEAR');
  const [circularBreakdown, setCircularBreakdown] = useState<CircularBreakdownMode>('STATUS_TIERS');
  const [selectedGoalId, setSelectedGoalId] = useState<string | 'ALL'>('ALL');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Filter Annual Goals for Selected Year
  const annualGoals = useMemo(() => {
    return goals.filter(g => {
      const gYear = g.year || today.year;
      return gYear === selectedYear && (g.period === 'ANNUAL' || (!g.period && !g.parentId));
    });
  }, [goals, selectedYear, today.year]);

  // Compute metrics for a single goal
  const computeGoalMetrics = useMemo(() => {
    return (goal: Goal) => {
      // 1. Manual progress overrides automated calculations
      if (goal.isManualProgressActive && typeof goal.manualProgress === 'number') {
        const p = Math.max(0, Math.min(100, Math.round(goal.manualProgress)));
        return {
          percent: p,
          completedTasks: 0,
          totalTasks: 0,
          linkedHabitsCount: 0,
          habitChecks: 0,
          isCompleted: goal.status === 'COMPLETED' || p === 100
        };
      }

      // 2. Child sub-goals (seasonal / monthly milestones)
      const childGoals = goals.filter(g => g.parentId === goal.id);
      const relevantGoalIds = [goal.id, ...childGoals.map(c => c.id)];

      // 3. Linked Tasks
      const linkedTasks = tasks.filter(t => t.goalId && relevantGoalIds.includes(t.goalId));
      const totalTasks = linkedTasks.length;
      const completedTasks = linkedTasks.filter(t => t.isCompleted).length;

      // 4. Linked Habits
      const linkedHabits = habits.filter(h => h.goalId && relevantGoalIds.includes(h.goalId));
      let totalHabitChecks = 0;
      linkedHabits.forEach(h => {
        if (!h.completionHistory) return;
        Object.entries(h.completionHistory).forEach(([dateStr, isDone]) => {
          if (!isDone) return;
          const parsed = parseJalaliString(dateStr);
          if (parsed && parsed.year === selectedYear) {
            totalHabitChecks++;
          }
        });
      });

      if (totalTasks === 0 && linkedHabits.length === 0) {
        const p = goal.status === 'COMPLETED' ? 100 : goal.status === 'IN_PROGRESS' ? 30 : 0;
        return {
          percent: p,
          completedTasks: 0,
          totalTasks: 0,
          linkedHabitsCount: 0,
          habitChecks: 0,
          isCompleted: p === 100
        };
      }

      let score = 0;
      let maxScore = 0;

      if (totalTasks > 0) {
        score += (completedTasks / totalTasks) * 70;
        maxScore += 70;
      }
      if (linkedHabits.length > 0) {
        // Expected checks benchmark throughout active periods
        const benchmark = Math.max(1, linkedHabits.length * 30);
        const habitFraction = Math.min(1, totalHabitChecks / benchmark);
        score += habitFraction * 30;
        maxScore += 30;
      }

      let percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      if (goal.status === 'COMPLETED') percent = 100;

      return {
        percent,
        completedTasks,
        totalTasks,
        linkedHabitsCount: linkedHabits.length,
        habitChecks: totalHabitChecks,
        isCompleted: percent === 100 || goal.status === 'COMPLETED'
      };
    };
  }, [goals, tasks, habits, selectedYear]);

  // Overall average progress of all annual goals for the selected year
  const overallAnnualMetrics = useMemo(() => {
    if (annualGoals.length === 0) {
      return {
        averagePercent: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        totalLinkedTasks: 0,
        completedLinkedTasks: 0,
        totalHabitChecks: 0,
      };
    }

    let sumPercent = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let totalLinkedTasks = 0;
    let completedLinkedTasks = 0;
    let totalHabitChecks = 0;

    annualGoals.forEach(g => {
      const m = computeGoalMetrics(g);
      sumPercent += m.percent;
      totalLinkedTasks += m.totalTasks;
      completedLinkedTasks += m.completedTasks;
      totalHabitChecks += m.habitChecks;

      if (m.percent === 100 || g.status === 'COMPLETED') {
        completedCount++;
      } else if (m.percent >= 15 || g.status === 'IN_PROGRESS') {
        inProgressCount++;
      } else {
        notStartedCount++;
      }
    });

    const averagePercent = Math.round(sumPercent / annualGoals.length);

    return {
      averagePercent,
      completedCount,
      inProgressCount,
      notStartedCount,
      totalLinkedTasks,
      completedLinkedTasks,
      totalHabitChecks,
    };
  }, [annualGoals, computeGoalMetrics]);

  // Leading & Attention Goals
  const { leadingGoal, laggingGoal } = useMemo(() => {
    if (annualGoals.length === 0) return { leadingGoal: null, laggingGoal: null };
    const sorted = [...annualGoals].map(g => ({
      goal: g,
      metrics: computeGoalMetrics(g)
    })).sort((a, b) => b.metrics.percent - a.metrics.percent);

    return {
      leadingGoal: sorted[0],
      laggingGoal: sorted[sorted.length - 1]
    };
  }, [annualGoals, computeGoalMetrics]);

  // -------------------------------------------------------------
  // 1. DATA PREPARATION: Linear Timeline Trend (12 Months of Jalali)
  // -------------------------------------------------------------
  const linearTimelineData = useMemo(() => {
    // Determine cutoff month for current year
    const isPastYear = selectedYear < today.year;
    const isFutureYear = selectedYear > today.year;
    const activeCutoffMonth = isPastYear ? 12 : isFutureYear ? 0 : today.month;

    return PERSIAN_MONTHS.map((monthName, idx) => {
      const m = idx + 1; // 1 to 12
      const isPastOrCurrent = m <= activeCutoffMonth;
      const isCurrentMonth = selectedYear === today.year && m === today.month;

      // Ideal benchmark pace for month m (e.g. Month 1: 8.3%, Month 6: 50%, Month 12: 100%)
      const idealBenchmarkPace = Math.round((m / 12) * 100);

      // Calculate progress of each annual goal up to month m
      let totalSumForMonth = 0;
      const goalProgressMap: Record<string, number> = {};

      annualGoals.forEach(goal => {
        const finalMetrics = computeGoalMetrics(goal);
        let goalMonthPercent = 0;

        if (isPastOrCurrent) {
          // Calculate historical contribution up to month m
          const childGoals = goals.filter(g => g.parentId === goal.id);
          const relevantGoalIds = [goal.id, ...childGoals.map(c => c.id)];

          // Tasks completed on or before month m in selectedYear
          const goalTasks = tasks.filter(t => t.goalId && relevantGoalIds.includes(t.goalId));
          const completedUpToM = goalTasks.filter(t => {
            if (!t.isCompleted) return false;
            const dateStr = t.completedAt || t.dueDate;
            if (!dateStr) return m === activeCutoffMonth;
            const parsed = parseJalaliString(dateStr);
            if (!parsed) return m === activeCutoffMonth;
            if (parsed.year === selectedYear) {
              return parsed.month <= m;
            } else if (parsed.year < selectedYear) {
              return true;
            }
            return false;
          }).length;

          // Habits checks up to month m in selectedYear
          const goalHabits = habits.filter(h => h.goalId && relevantGoalIds.includes(h.goalId));
          let habitChecksUpToM = 0;
          goalHabits.forEach(h => {
            if (!h.completionHistory) return;
            Object.entries(h.completionHistory).forEach(([dateStr, isDone]) => {
              if (!isDone) return;
              const parsed = parseJalaliString(dateStr);
              if (parsed && parsed.year === selectedYear && parsed.month <= m) {
                habitChecksUpToM++;
              }
            });
          });

          if (goal.isManualProgressActive && typeof goal.manualProgress === 'number') {
            // Smooth historical trajectory up to current manual progress
            if (activeCutoffMonth > 0) {
              goalMonthPercent = Math.min(100, Math.round((goal.manualProgress * (m / activeCutoffMonth))));
            } else {
              goalMonthPercent = 0;
            }
          } else if (goalTasks.length === 0 && goalHabits.length === 0) {
            if (goal.status === 'COMPLETED') {
              goalMonthPercent = m >= activeCutoffMonth ? 100 : Math.round((m / 12) * 100);
            } else {
              goalMonthPercent = Math.round((finalMetrics.percent * m) / Math.max(1, activeCutoffMonth));
            }
          } else {
            let taskScore = goalTasks.length > 0 ? (completedUpToM / goalTasks.length) * 70 : 0;
            let expectedChecks = Math.max(1, goalHabits.length * m * 12);
            let habitScore = goalHabits.length > 0 ? Math.min(30, (habitChecksUpToM / expectedChecks) * 30) : 0;
            let rawScore = taskScore + habitScore;
            let maxAvailable = (goalTasks.length > 0 ? 70 : 0) + (goalHabits.length > 0 ? 30 : 0);
            goalMonthPercent = maxAvailable > 0 ? Math.round((rawScore / maxAvailable) * 100) : 0;

            // Ensure last measured month matches final metrics
            if (m === activeCutoffMonth) {
              goalMonthPercent = finalMetrics.percent;
            }
          }
        } else {
          // Future projection (پیش‌بینی بر اساس شیب فعلی)
          if (activeCutoffMonth > 0) {
            const currentPacePerMonth = finalMetrics.percent / activeCutoffMonth;
            goalMonthPercent = Math.min(100, Math.round(finalMetrics.percent + currentPacePerMonth * (m - activeCutoffMonth)));
          } else {
            goalMonthPercent = 0;
          }
        }

        goalProgressMap[`goal_${goal.id}`] = goalMonthPercent;
        totalSumForMonth += goalMonthPercent;
      });

      const overallMonthPercent = annualGoals.length > 0
        ? Math.round(totalSumForMonth / annualGoals.length)
        : 0;

      return {
        monthIndex: m,
        monthName,
        idealBenchmarkPace,
        overallActual: isPastOrCurrent ? overallMonthPercent : null,
        overallProjected: !isPastOrCurrent ? overallMonthPercent : (isCurrentMonth ? overallMonthPercent : null),
        isCurrentMonth,
        isPastOrCurrent,
        ...goalProgressMap
      };
    });
  }, [annualGoals, selectedYear, today, computeGoalMetrics, goals, tasks, habits]);

  // -------------------------------------------------------------
  // 2. DATA PREPARATION: Circular / Donut Distribution Chart
  // -------------------------------------------------------------
  const circularChartData = useMemo(() => {
    if (annualGoals.length === 0) return [];

    if (circularBreakdown === 'STATUS_TIERS') {
      // Group by Botanical / Achievement Stages
      const tiers = [
        { key: 'BLOOM', name: 'شکوفا شده (۱۰۰٪)', color: '#059669', count: 0, goalsList: [] as Goal[] },
        { key: 'HIGH', name: 'پیشرفت چشمگیر (۷۰-۹۹٪)', color: '#10B981', count: 0, goalsList: [] as Goal[] },
        { key: 'MEDIUM', name: 'مرحله میانی (۳۰-۶۹٪)', color: '#F59E0B', count: 0, goalsList: [] as Goal[] },
        { key: 'LOW', name: 'آغاز راه یا نیازمند توجه (زیر ۳۰٪)', color: '#94A3B8', count: 0, goalsList: [] as Goal[] },
      ];

      annualGoals.forEach(g => {
        const m = computeGoalMetrics(g);
        if (m.percent === 100 || g.status === 'COMPLETED') {
          tiers[0].count++;
          tiers[0].goalsList.push(g);
        } else if (m.percent >= 70) {
          tiers[1].count++;
          tiers[1].goalsList.push(g);
        } else if (m.percent >= 30) {
          tiers[2].count++;
          tiers[2].goalsList.push(g);
        } else {
          tiers[3].count++;
          tiers[3].goalsList.push(g);
        }
      });

      const total = annualGoals.length;
      return tiers
        .filter(t => t.count > 0)
        .map(t => ({
          name: t.name,
          value: t.count,
          percentage: (t.count / total) * 100,
          color: t.color,
          subText: `${toPersianDigits(t.count)} هدف سالانه`,
          goalsList: t.goalsList
        }));
    } else if (circularBreakdown === 'CATEGORIES') {
      // Group by Category
      const catMap = new Map<string, { title: string; color: string; count: number; sumPercent: number; goalsList: Goal[] }>();

      categories.forEach(c => {
        catMap.set(c.id, {
          title: c.title,
          color: c.colorHex || '#10B981',
          count: 0,
          sumPercent: 0,
          goalsList: []
        });
      });

      // Default bucket for uncategorized
      catMap.set('uncategorized', {
        title: 'عمومی / سایر',
        color: '#64748B',
        count: 0,
        sumPercent: 0,
        goalsList: []
      });

      annualGoals.forEach(g => {
        const catId = g.categoryId && catMap.has(g.categoryId) ? g.categoryId : 'uncategorized';
        const entry = catMap.get(catId)!;
        const m = computeGoalMetrics(g);
        entry.count++;
        entry.sumPercent += m.percent;
        entry.goalsList.push(g);
      });

      const activeEntries = Array.from(catMap.values()).filter(e => e.count > 0);
      const total = annualGoals.length;

      return activeEntries.map(e => ({
        name: e.title,
        value: e.count,
        percentage: (e.count / total) * 100,
        color: e.color,
        averageProgress: Math.round(e.sumPercent / e.count),
        subText: `میانگین تحقق: ${toPersianDigits(Math.round(e.sumPercent / e.count))}٪`,
        goalsList: e.goalsList
      }));
    } else {
      // Individual Goals breakdown
      return annualGoals.map((g, idx) => {
        const m = computeGoalMetrics(g);
        const cat = categories.find(c => c.id === g.categoryId);
        return {
          name: g.title,
          value: Math.max(5, m.percent), // Minimum visual slice if 0
          exactPercent: m.percent,
          percentage: m.percent,
          color: g.colorHex || cat?.colorHex || PALETTE[idx % PALETTE.length],
          subText: `${toPersianDigits(m.percent)}٪ پیشرفت (${toPersianDigits(m.completedTasks)} از ${toPersianDigits(m.totalTasks)} تسک)`,
          goal: g,
          metrics: m
        };
      });
    }
  }, [annualGoals, circularBreakdown, computeGoalMetrics, categories]);

  // Pace Assessment: Compare current actual progress with expected ideal pace
  const currentExpectedPace = Math.round((today.month / 12) * 100);
  const paceDiff = overallAnnualMetrics.averagePercent - currentExpectedPace;
  const paceStatus = useMemo(() => {
    if (annualGoals.length === 0) return { label: 'بدون هدف سالانه', color: 'text-gray-500', icon: InfoIcon };
    if (selectedYear < today.year) {
      return {
        label: `پرونده سال ${toPersianDigits(selectedYear)} بسته شده`,
        color: 'text-emerald-700',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
    if (paceDiff >= 5) {
      return {
        label: `${toPersianDigits(Math.abs(paceDiff))}٪ جلوتر از تقویم زمانی`,
        color: 'text-emerald-700',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    } else if (paceDiff <= -10) {
      return {
        label: `${toPersianDigits(Math.abs(paceDiff))}٪ نیازمند تسریع و جبران`,
        color: 'text-amber-700',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    } else {
      return {
        label: 'هماهنگ با شیب استاندارد سال',
        color: 'text-teal-700',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200'
      };
    }
  }, [paceDiff, annualGoals.length, selectedYear, today.year]);

  // Botanical Stage
  const botanicalStageInfo = getBotanicalStageFromPercent(overallAnnualMetrics.averagePercent);

  // Active shape for Circular Donut hover
  const renderActivePieShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
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
          innerRadius={outerRadius + 11}
          outerRadius={outerRadius + 15}
          fill={fill}
          opacity={0.35}
        />
      </g>
    );
  };

  // Custom Linear Chart Tooltip
  const CustomLinearTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataPoint = payload[0].payload;
    const isPast = dataPoint.isPastOrCurrent;
    const isCurrent = dataPoint.isCurrentMonth;

    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-200 shadow-xl text-right dir-rtl min-w-[210px] space-y-2 z-50">
        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
          <span className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>ماه {label}</span>
          </span>
          {isCurrent ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              ماه کنونی
            </span>
          ) : isPast ? (
            <span className="text-[10px] font-medium text-gray-500">
              سپری‌شده
            </span>
          ) : (
            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              پیش‌بینی
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs">
          {dataPoint.overallActual !== null && (
            <div className="flex justify-between items-center text-gray-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>میانگین واقعی اهداف:</span>
              </span>
              <span className="font-extrabold text-emerald-800 text-sm font-mono">
                {toPersianDigits(dataPoint.overallActual)}٪
              </span>
            </div>
          )}

          {dataPoint.overallProjected !== null && !isCurrent && (
            <div className="flex justify-between items-center text-gray-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span>روند پیش‌بینی‌شده:</span>
              </span>
              <span className="font-bold text-indigo-700 font-mono">
                {toPersianDigits(dataPoint.overallProjected)}٪
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-gray-400 inline-block" />
              <span>خط شیب استاندارد سال:</span>
            </span>
            <span className="font-medium text-gray-700 font-mono">
              {toPersianDigits(dataPoint.idealBenchmarkPace)}٪
            </span>
          </div>

          {selectedGoalId !== 'ALL' && dataPoint[`goal_${selectedGoalId}`] !== undefined && (
            <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-gray-800">
              <span>هدف انتخاب‌شده:</span>
              <span className="font-extrabold text-blue-700 font-mono">
                {toPersianDigits(dataPoint[`goal_${selectedGoalId}`])}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100/90 shadow-xs space-y-6 ${className}`}>
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
                  تحلیل و پایش روند پیشرفت اهداف سالانه
                </h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${paceStatus.badgeClass}`}>
                  {paceStatus.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  تحلیل هوشمند تجمعی بر اساس تسک‌های خرد، پیوستگی عادات و گام‌های کلیدی سال {toPersianDigits(selectedYear)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher, Year Selector, and Format Switch */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Year selector */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-xs">
            <span className="text-[11px] text-gray-400 ml-1.5 font-medium">سال:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="انتخاب سال گزارش اهداف"
              className="bg-transparent font-bold text-gray-800 text-xs focus:outline-none cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  سال {toPersianDigits(yr)} {yr === today.year ? '(جاری)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle between LINEAR and CIRCULAR */}
          <div className="flex items-center bg-emerald-50/80 p-0.5 rounded-xl border border-emerald-200/90 text-xs">
            <button
              type="button"
              onClick={() => setChartViewMode('LINEAR')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'LINEAR'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/60'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>نمودار خطی</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('CIRCULAR')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'CIRCULAR'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/60'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>نمودار دایره‌ای</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Analytical Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Overall Progress */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
            <span className="font-semibold">میانگین تحقق اهداف سال</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
            {toPersianDigits(overallAnnualMetrics.averagePercent)}٪
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full bg-emerald-100/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${overallAnnualMetrics.averagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-700/80 mt-1 truncate">
              {botanicalStageInfo.title}
            </p>
          </div>
        </div>

        {/* KPI 2: Completed / In Progress Goals */}
        <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-teal-800 mb-1">
            <span className="font-semibold">اهداف به ثمر نشسته</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-950 font-mono">
            {toPersianDigits(overallAnnualMetrics.completedCount)} <span className="text-xs font-normal text-teal-700">از {toPersianDigits(annualGoals.length)}</span>
          </div>
          <p className="text-[11px] text-teal-700/80 mt-1">
            {toPersianDigits(overallAnnualMetrics.inProgressCount)} هدف در حال پیگیری مداوم
          </p>
        </div>

        {/* KPI 3: Supporting Tasks Completed */}
        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span className="font-semibold">تسک‌های تحقق‌یافته</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
            {toPersianDigits(overallAnnualMetrics.completedLinkedTasks)} <span className="text-xs font-normal text-amber-700">تسک</span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">
            از {toPersianDigits(overallAnnualMetrics.totalLinkedTasks)} تسک پشتیبان اهداف
          </p>
        </div>

        {/* KPI 4: Leading Goal or Pace */}
        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-800 mb-1">
            <span className="font-semibold">هدف پیشرو سال</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-sm sm:text-base font-extrabold text-indigo-950 truncate">
            {leadingGoal ? leadingGoal.goal.title : '—'}
          </div>
          <p className="text-[11px] text-indigo-700/80 mt-1">
            {leadingGoal
              ? `پیشرفت ${toPersianDigits(leadingGoal.metrics.percent)}٪ (${leadingGoal.goal.plantType || 'نهال سرسبز'})`
              : 'هدفی تعریف نشده'}
          </p>
        </div>
      </div>

      {/* 3. Empty State Check */}
      {annualGoals.length === 0 ? (
        <div className="bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200 p-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-800">
              هنوز هدفی برای سال {toPersianDigits(selectedYear)} تعریف نشده است
            </h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              با ایجاد اهداف سالانه در تب «اهداف» و اتصال تسک‌ها و عادات به آن‌ها، روند پیشرفت تجمعی و خطی باغچه شما در طول ماه‌ها به‌صورت زنده ترسیم می‌شود.
            </p>
          </div>
          {onNavigateToGoals && (
            <button
              type="button"
              onClick={onNavigateToGoals}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <span>رفتن به صفحه اهداف و ایجاد هدف سالانه</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 4. Chart Render Body */}
          {viewMode === 'LINEAR' ? (
            /* LINEAR TIMELINE TREND CHART */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 font-semibold">فیلتر نمایش خطوط:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedGoalId('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedGoalId === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    نمای کلی (میانگین همه اهداف)
                  </button>

                  {annualGoals.map(g => {
                    const isSelected = selectedGoalId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGoalId(g.id)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 truncate max-w-[160px] ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={g.title}
                      >
                        {g.plantType && <PlantIcon type={g.plantType} size="xs" />}
                        <span className="truncate">{g.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Legend indicator */}
                <div className="flex items-center gap-3 text-[11px] text-gray-500 self-end sm:self-auto">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1 bg-emerald-600 rounded-full" />
                    <span>تحقق واقعی</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1 border-t-2 border-dashed border-indigo-400" />
                    <span>پیش‌بینی</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1 border-t border-gray-400" />
                    <span>شیب ایده‌آل</span>
                  </span>
                </div>
              </div>

              {/* Responsive Line / Area Chart Container */}
              <div className="h-72 sm:h-80 w-full pt-2">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={linearTimelineData}
                      margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="annualProgressGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818CF8" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

                      <XAxis
                        dataKey="monthName"
                        tick={{ fontSize: 11, fill: '#475569', fontFamily: 'Vazirmatn' }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />

                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'Vazirmatn' }}
                        tickFormatter={(val) => `${toPersianDigits(val)}٪`}
                        axisLine={false}
                        tickLine={false}
                      />

                      <RechartsTooltip content={<CustomLinearTooltip />} />

                      {/* Ideal Benchmark Pace Line */}
                      <Line
                        type="monotone"
                        dataKey="idealBenchmarkPace"
                        name="شیب ایده‌آل سال"
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={false}
                      />

                      {/* Actual Achievement Area (Solid Emerald) */}
                      <Area
                        type="monotone"
                        dataKey="overallActual"
                        name="تحقق واقعی"
                        stroke="#059669"
                        strokeWidth={3}
                        fill="url(#annualProgressGradient)"
                        dot={{ r: 3.5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                        connectNulls={false}
                      />

                      {/* Projected Future Area (Dashed Indigo) */}
                      <Area
                        type="monotone"
                        dataKey="overallProjected"
                        name="پیش‌بینی مسیر"
                        stroke="#6366F1"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#projectedGradient)"
                        dot={{ r: 3, fill: '#6366F1' }}
                        connectNulls={true}
                      />

                      {/* Selected Goal Line if specific goal active */}
                      {selectedGoalId !== 'ALL' && (
                        <Line
                          type="monotone"
                          dataKey={`goal_${selectedGoalId}`}
                          name="هدف انتخابی"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#2563EB', stroke: '#ffffff', strokeWidth: 1.5 }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : (
            /* CIRCULAR / DONUT BREAKDOWN CHART */
            <div className="space-y-4">
              {/* Sub-mode selector */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-gray-100 pb-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-semibold">تفکیک دایره‌ای بر اساس:</span>
                  <button
                    type="button"
                    onClick={() => { setCircularBreakdown('STATUS_TIERS'); setActivePieIndex(null); }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      circularBreakdown === 'STATUS_TIERS'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    مراحل رشد و تحقق
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCircularBreakdown('CATEGORIES'); setActivePieIndex(null); }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      circularBreakdown === 'CATEGORIES'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    حوزه‌ها و دسته‌بندی‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCircularBreakdown('INDIVIDUAL_GOALS'); setActivePieIndex(null); }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      circularBreakdown === 'INDIVIDUAL_GOALS'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    سهم هر یک از اهداف
                  </button>
                </div>
              </div>

              {/* Donut Chart and Drill-down List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Donut Column */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
                  <div className="h-64 sm:h-72 w-full max-w-[300px] relative">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={circularChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={68}
                            outerRadius={105}
                            paddingAngle={circularChartData.length > 1 ? 4 : 0}
                            cornerRadius={6}
                            stroke="#ffffff"
                            strokeWidth={2.5}
                            activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                            activeShape={renderActivePieShape}
                            onMouseEnter={(_, index) => setActivePieIndex(index)}
                            onMouseLeave={() => setActivePieIndex(null)}
                          >
                            {circularChartData.map((entry, index) => (
                              <Cell
                                key={`donut-cell-${index}`}
                                fill={entry.color}
                                className="transition-all duration-300 cursor-pointer outline-none"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    )}

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                      {activePieIndex !== null && circularChartData[activePieIndex] ? (
                        <div className="animate-fade-in space-y-0.5">
                          <span className="text-[11px] font-bold text-gray-500 block truncate max-w-[130px]">
                            {circularChartData[activePieIndex].name}
                          </span>
                          <span
                            className="text-2xl font-black font-mono block"
                            style={{ color: circularChartData[activePieIndex].color }}
                          >
                            {toPersianDigits(circularChartData[activePieIndex].percentage.toFixed(0))}٪
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {circularChartData[activePieIndex].subText}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-3xl font-black text-emerald-950 font-mono block">
                            {toPersianDigits(overallAnnualMetrics.averagePercent)}٪
                          </span>
                          <span className="text-[11px] font-bold text-emerald-800 block">
                            تحقق میانگین سال
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {toPersianDigits(annualGoals.length)} هدف سالانه
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slices Detail Cards Column */}
                <div className="lg:col-span-7 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {circularChartData.map((item, idx) => {
                    const isHovered = activePieIndex === idx;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setActivePieIndex(idx)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        className={`rounded-2xl border p-3 transition-all duration-200 ${
                          isHovered
                            ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                            : 'border-gray-200/90 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-lg shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {item.name}
                              </h5>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {item.subText}
                              </p>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span
                              className="text-sm sm:text-base font-extrabold font-mono"
                              style={{ color: item.color }}
                            >
                              {toPersianDigits(item.percentage.toFixed(0))}٪
                            </span>
                          </div>
                        </div>

                        {/* Progress line */}
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(4, item.percentage)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 5. Detailed Goal Trajectory Table / Breakdown Cards */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>وضعیت پیشرفت و عملکرد هر هدف سالانه</span>
              </h4>
              <span className="text-[11px] text-gray-400">
                بر اساس داده‌های واقعی تسک‌ها و عادات ثبت‌شده
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {annualGoals.map(goal => {
                const metrics = computeGoalMetrics(goal);
                const cat = categories.find(c => c.id === goal.categoryId);
                const isGoalSelected = selectedGoalId === goal.id;

                return (
                  <div
                    key={goal.id}
                    onClick={() => setSelectedGoalId(selectedGoalId === goal.id ? 'ALL' : goal.id)}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                      isGoalSelected
                        ? 'border-blue-400 bg-blue-50/30 ring-1 ring-blue-300 shadow-xs'
                        : 'border-emerald-100/90 bg-emerald-50/20 hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {cat && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1"
                                style={{
                                  backgroundColor: `${cat.colorHex}15`,
                                  color: cat.colorHex,
                                  borderColor: `${cat.colorHex}30`
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.colorHex }} />
                                <span>{cat.title}</span>
                              </span>
                            )}
                            {goal.isManualProgressActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                ثبت دستی
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs sm:text-sm font-bold text-gray-900 mt-1.5 flex items-center gap-1.5">
                            {goal.plantType && <PlantIcon type={goal.plantType} size="xs" />}
                            <span className="truncate">{goal.title}</span>
                          </h5>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-base font-extrabold text-emerald-700 font-mono">
                            {toPersianDigits(metrics.percent)}٪
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2.5">
                        <div className="h-2 w-full bg-emerald-100/70 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${metrics.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="pt-3 mt-3 border-t border-emerald-100/60 flex items-center justify-between text-[11px] text-gray-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{toPersianDigits(metrics.completedTasks)} از {toPersianDigits(metrics.totalTasks)} تسک انجام‌شده</span>
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
          </div>

          {/* 6. Actionable Botanical Insight Banner */}
          <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/60 rounded-2xl p-4 border border-emerald-200/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <Sparkles className="w-4.5 h-4.5 text-emerald-100" />
            </div>
            <div className="text-xs text-gray-700 leading-relaxed space-y-1">
              <p>
                <span className="font-bold text-emerald-900">تحلیل هوشمند جوانه برای اهداف سالانه: </span>
                در حال حاضر میانگین تحقق اهداف سال {toPersianDigits(selectedYear)} به{' '}
                <span className="font-bold text-emerald-800">{toPersianDigits(overallAnnualMetrics.averagePercent)}٪</span>{' '}
                رسیده است ({paceStatus.label}).
                {leadingGoal && (
                  <span>
                    {' '}هدف <span className="font-bold text-emerald-900">«{leadingGoal.goal.title}»</span> بیشترین رشد را داشته و به مرحله ثمربخشی نزدیک‌تر است.
                  </span>
                )}
              </p>
              {laggingGoal && laggingGoal.metrics.percent < 40 && (
                <p className="text-gray-600 text-[11px]">
                  💡 <span className="font-semibold text-amber-800">توصیه باغبانی:</span> برای هدف{' '}
                  <span className="font-bold text-gray-900">«{laggingGoal.goal.title}»</span> تعریف ۲ تا ۳ تسک خرد هفتگی یا پیوند یک عادت روزانه موجب تسریع چشمگیر در روند رشد آن خواهد شد.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function InfoIcon(props: any) {
  return <HelpCircle {...props} />;
}
