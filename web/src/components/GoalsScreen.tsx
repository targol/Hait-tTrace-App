import React, { useState, useMemo } from 'react';
import { Goal, AppTask, Habit, GoalStatus, Category } from '../types';
import { toPersianDigits, PERSIAN_MONTHS, getTodayJalali, jalaliToFormattedString, parseJalaliString } from '../calendar/jalali';
import { 
  Plus, 
  Target, 
  Trash2, 
  Edit3, 
  History, 
  Calendar, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  Play, 
  Layers, 
  CheckSquare, 
  PlayCircle,
  PauseCircle,
  Tag,
  Sliders,
  Repeat,
  AlertCircle,
  X,
  Search,
  LayoutGrid,
  ListTree,
  Eye,
  EyeOff,
  Copy,
  Filter
} from 'lucide-react';
import { PlantIcon } from './PlantIcon';
import { GoalProgressModal } from './GoalProgressModal';
import { TransferPeriodItemsModal } from './TransferPeriodItemsModal';
import { EntityIcon, EntityBadge } from './EntityIcon';
import { SeasonBadge } from './SeasonBadge';
import { TransferTaskModal } from './TransferTaskModal';
import { SeasonGardenCard } from './SeasonGardenCard';
import { YearGardenOverviewCard } from './YearGardenOverviewCard';

interface Props {
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  categories: Category[];
  onOpenAnnualWizard: () => void;
  onNewGoal: (parentId?: string | null, period?: 'ANNUAL' | 'SEASONAL' | 'MONTHLY', seasonIndex?: number) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onViewHistory: (goal: Goal) => void;
  onNewTaskForGoal: (goalId: string) => void;
  onNewHabitForGoal?: (goalId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleHabitToday?: (habitId: string) => void;
  onOpenTimer: (title: string, minutes: number, onDone: () => void) => void;
  onUpdateGoalProgress?: (goalId: string, manualProgress: number | null, isManualActive: boolean) => void;
  onTransferSeasonItems?: (fromGoalId: string, targetSeasonIndex?: number) => void;
  onDeleteCategory?: (catId: string) => void;
  onTransferGoalItems?: (
    fromGoalId: string,
    targetGoalId: string,
    options: { transferTasks: boolean; transferHabits: boolean }
  ) => void;
  onCreateTargetAndTransfer?: (
    fromGoal: Goal,
    targetTitle: string,
    targetPeriod: 'SEASONAL' | 'MONTHLY' | 'ANNUAL',
    targetSeasonIndex?: number,
    targetMonthIndex?: number,
    targetYear?: number
  ) => void;
  onCloseGoalPendingItems?: (goalId: string) => void;
  onTransferTask?: (taskId: string, targetGoalId: string | null, closeTask: boolean, noteAppend?: string) => void;
  onCreateSeasonalGoalAndTransfer?: (
    taskId: string, 
    seasonIdx: number, 
    year: number, 
    title: string,
    parentAnnualId?: string | null, 
    categoryId?: string
  ) => void;
  onDuplicateTask?: (task: AppTask) => void;
}

const SEASON_CONFIG = [
  {
    name: 'بهار',
    months: 'فروردین، اردیبهشت، خرداد',
    icon: '🌸',
    cardBg: 'bg-emerald-50/50 border-emerald-200 border-r-4 border-r-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    progressBar: 'bg-gradient-to-r from-emerald-500 to-green-600',
  },
  {
    name: 'تابستان',
    months: 'تیر، مرداد، شهریور',
    icon: '☀️',
    cardBg: 'bg-amber-50/50 border-amber-200 border-r-4 border-r-amber-500',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    progressBar: 'bg-gradient-to-r from-amber-500 to-yellow-600',
  },
  {
    name: 'پاییز',
    months: 'مهر، آبان، آذر',
    icon: '🍂',
    cardBg: 'bg-orange-50/50 border-orange-200 border-r-4 border-r-orange-500',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    progressBar: 'bg-gradient-to-r from-orange-500 to-amber-600',
  },
  {
    name: 'زمستان',
    months: 'دی، بهمن، اسفند',
    icon: '❄️',
    cardBg: 'bg-sky-50/50 border-sky-200 border-r-4 border-r-sky-500',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    progressBar: 'bg-gradient-to-r from-sky-500 to-indigo-600',
  },
];

interface GoalVisualProgressSliderProps {
  goalId: string;
  progress: number;
  isManual: boolean;
  autoProgress: number;
  colorHex: string;
  compact?: boolean;
  onUpdateProgress?: (goalId: string, manualProgress: number | null, isManualActive: boolean) => void;
  onOpenModal?: () => void;
}

export const GoalVisualProgressSlider: React.FC<GoalVisualProgressSliderProps> = ({
  goalId,
  progress,
  isManual,
  autoProgress,
  colorHex,
  compact = false,
  onUpdateProgress,
  onOpenModal,
}) => {
  return (
    <div 
      className={`rounded-xl border transition-all ${compact ? 'p-2 space-y-1.5' : 'p-2.5 space-y-2'}`}
      style={{
        backgroundColor: '#ffffffdd',
        borderColor: `${colorHex}35`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header: Percentage, Manual/Auto tag, and action buttons */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-gray-700">میزان پیشرفت:</span>
          <strong className="font-bold text-gray-950 text-sm font-mono">
            {toPersianDigits(progress)}٪
          </strong>
          <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-medium border ${
            isManual 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {isManual ? 'دستی' : 'خودکار'}
          </span>
          {isManual && (
            <button
              type="button"
              onClick={() => onUpdateProgress?.(goalId, null, false)}
              className="text-[9px] text-gray-500 hover:text-emerald-700 hover:underline cursor-pointer"
              title={`محاسبه خودکار سیستم (${toPersianDigits(autoProgress)}٪)`}
            >
              (بازگشت به خودکار: {toPersianDigits(autoProgress)}٪)
            </button>
          )}
        </div>

        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="text-[10px] sm:text-[11px] font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            title="تنظیم دقیق پیشرفت"
          >
            <Sliders className="w-3 h-3 text-emerald-600" />
            <span>تنظیم دقیق</span>
          </button>
        )}
      </div>

      {/* Visual Slider with live progress track */}
      <div className="space-y-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={(e) => {
              const val = Number(e.target.value);
              onUpdateProgress?.(goalId, val, true);
            }}
            className="w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-hidden transition-all bg-gray-200"
            style={{
              accentColor: colorHex,
              background: `linear-gradient(to left, ${colorHex} ${progress}%, #e5e7eb ${progress}%)`,
            }}
            title={`تغییر درصد پیشرفت با اسلایدر: ${toPersianDigits(progress)}٪`}
          />
        </div>

        {/* Preset quick values row */}
        {!compact && (
          <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
            {[0, 25, 50, 75, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onUpdateProgress?.(goalId, val, true)}
                className={`px-1.5 py-0.5 rounded font-mono transition-all cursor-pointer ${
                  progress === val 
                    ? 'bg-gray-900 text-white font-bold' 
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                %{toPersianDigits(val)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const GoalsScreen: React.FC<Props> = ({
  goals,
  tasks,
  habits,
  categories,
  onOpenAnnualWizard,
  onNewGoal,
  onEditGoal,
  onDeleteGoal,
  onViewHistory,
  onNewTaskForGoal,
  onNewHabitForGoal,
  onToggleTask,
  onToggleHabitToday,
  onOpenTimer,
  onUpdateGoalProgress,
  onTransferSeasonItems,
  onDeleteCategory,
  onTransferGoalItems,
  onCreateTargetAndTransfer,
  onCloseGoalPendingItems,
  onTransferTask,
  onCreateSeasonalGoalAndTransfer,
  onDuplicateTask,
}) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);
  const currentSeasonIdx = Math.floor((today.month - 1) / 3);

  // States
  const [viewMode, setViewMode] = useState<'TREE' | 'SEASONS'>('TREE');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | number>('ALL');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Modal states for Progress adjustment & Transfer
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [transferGoal, setTransferGoal] = useState<Goal | null>(null);
  const [taskToTransfer, setTaskToTransfer] = useState<AppTask | null>(null);
  const [dismissedRolloverNotice, setDismissedRolloverNotice] = useState<boolean>(false);

  // Sanitize and flatten goals array so nested arrays can never break rendering
  const cleanGoals = useMemo(() => {
    if (!Array.isArray(goals)) return [];
    const flat: Goal[] = [];
    function walk(item: any) {
      if (!item) return;
      if (Array.isArray(item)) {
        item.forEach(walk);
      } else if (typeof item === 'object' && item.id && item.title) {
        flat.push({
          ...item,
          history: Array.isArray(item.history) ? item.history : [],
        });
      }
    }
    goals.forEach(walk);
    return flat;
  }, [goals]);

  const toggleExpand = (goalId: string) => {
    setExpandedGoals(prev => {
      const current = prev[goalId] !== undefined ? prev[goalId] : false;
      return { ...prev, [goalId]: !current };
    });
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    cleanGoals.forEach(g => { next[g.id] = true; });
    setExpandedGoals(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    cleanGoals.forEach(g => { next[g.id] = false; });
    setExpandedGoals(next);
  };

  // Recursively collect all descendant IDs with cycle prevention
  const getGoalDescendantIds = (goalId: string, visited = new Set<string>()): string[] => {
    if (visited.has(goalId)) return [];
    visited.add(goalId);
    const directChildren = cleanGoals.filter(g => g && g.parentId === goalId && g.id !== goalId);
    const grandChildIds = directChildren.flatMap(c => getGoalDescendantIds(c.id, visited));
    return [goalId, ...directChildren.map(c => c.id), ...grandChildIds];
  };

  // Compute automatic progress for a goal based on linked tasks and habits
  const calculateAutoGoalProgress = (goalId: string): number => {
    const targetGoal = cleanGoals.find(g => g && g.id === goalId);
    if (!targetGoal) return 0;

    // A goal for a future season or future month that has not arrived yet should NOT score automatically (0%)
    const goalYear = targetGoal.year || today.year;
    if (goalYear > today.year) {
      return 0;
    }
    if (goalYear === today.year) {
      if (targetGoal.period === 'SEASONAL' && targetGoal.seasonIndex !== undefined) {
        if (targetGoal.seasonIndex > currentSeasonIdx) {
          return 0;
        }
      }
      if (targetGoal.period === 'MONTHLY' && targetGoal.monthIndex !== undefined) {
        if (targetGoal.monthIndex > today.month) {
          return 0;
        }
      }
    }

    const allRelevantGoalIds = getGoalDescendantIds(goalId);
    const linkedTasks = (tasks || []).filter(t => t && t.goalId && allRelevantGoalIds.includes(t.goalId));
    
    // Direct or descendant habits
    const directHabits = (habits || []).filter(h => h && h.goalId && allRelevantGoalIds.includes(h.goalId));
    
    // An active habit linked to an annual goal inherits to all seasonal subgoals under it
    const inheritedAnnualHabits = (targetGoal.period === 'SEASONAL' && targetGoal.parentId)
      ? (habits || []).filter(h => h && h.goalId === targetGoal.parentId && !h.isClosed)
      : [];

    const habitsMap = new Map<string, Habit>();
    directHabits.forEach(h => habitsMap.set(h.id, h));
    inheritedAnnualHabits.forEach(h => habitsMap.set(h.id, h));
    const linkedHabits = Array.from(habitsMap.values());

    if (linkedTasks.length === 0 && linkedHabits.length === 0) {
      return 0;
    }

    let score = 0;
    let maxScore = 0;

    if (linkedTasks.length > 0) {
      const completedTasks = linkedTasks.filter(t => t.isCompleted).length;
      score += (completedTasks / linkedTasks.length) * 60;
      maxScore += 60;
    }

    if (linkedHabits.length > 0) {
      let totalHabitChecks = 0;
      linkedHabits.forEach(h => {
        const historyEntries = Object.entries(h.completionHistory || {});
        historyEntries.forEach(([dateStr, isDone]) => {
          if (!isDone) return;
          const parsed = parseJalaliString(dateStr);
          if (!parsed) return;

          if (targetGoal.year && parsed.year !== targetGoal.year) return;

          if (targetGoal.period === 'SEASONAL' && targetGoal.seasonIndex !== undefined) {
            const seasonStartMonth = targetGoal.seasonIndex * 3 + 1;
            const seasonEndMonth = seasonStartMonth + 2;
            if (parsed.month < seasonStartMonth || parsed.month > seasonEndMonth) return;
          }

          if (targetGoal.period === 'MONTHLY' && targetGoal.monthIndex !== undefined) {
            if (parsed.month !== targetGoal.monthIndex) return;
          }

          totalHabitChecks++;
        });
      });

      const habitPortion = Math.min(1, totalHabitChecks / (linkedHabits.length * 10));
      score += habitPortion * 40;
      maxScore += 40;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  // Effective progress: returns manual progress if active, otherwise auto calculated
  const getEffectiveGoalProgress = (goal: Goal): { progress: number; isManual: boolean; auto: number } => {
    const auto = calculateAutoGoalProgress(goal.id);
    if (goal.isManualProgressActive && goal.manualProgress !== undefined && goal.manualProgress !== null) {
      return { progress: Math.max(0, Math.min(100, goal.manualProgress)), isManual: true, auto };
    }
    if (goal.status === 'COMPLETED') {
      return { progress: 100, isManual: true, auto };
    }
    return { progress: auto, isManual: false, auto };
  };

  const topLevelGoals = useMemo(() => {
    return cleanGoals
      .filter(g => !g.parentId || g.period === 'ANNUAL' || !cleanGoals.some(p => p.id === g.parentId))
      .sort((a, b) => {
        const aYear = a.year || today.year;
        const bYear = b.year || today.year;
        if (aYear !== bYear) return bYear - aYear;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }, [cleanGoals, today.year]);

  const getSubGoals = (parentId: string) => {
    const list = cleanGoals.filter(g => g.parentId === parentId);
    return list.sort((a, b) => {
      // 1. Both seasonal: sort chronologically by seasonIndex (0: بهار, 1: تابستان, 2: پاییز, 3: زمستان)
      if (a.period === 'SEASONAL' && b.period === 'SEASONAL') {
        const aYear = a.year || today.year;
        const bYear = b.year || today.year;
        if (aYear !== bYear) return aYear - bYear;
        return (a.seasonIndex ?? 0) - (b.seasonIndex ?? 0);
      }
      // 2. Seasonal vs Monthly: order by calendar sequence
      if (a.period === 'SEASONAL' && b.period === 'MONTHLY') {
        const aYear = a.year || today.year;
        const bYear = b.year || today.year;
        if (aYear !== bYear) return aYear - bYear;
        const aMonth = (a.seasonIndex ?? 0) * 3 + 1;
        return aMonth - (b.monthIndex ?? 1);
      }
      if (a.period === 'MONTHLY' && b.period === 'SEASONAL') {
        const aYear = a.year || today.year;
        const bYear = b.year || today.year;
        if (aYear !== bYear) return aYear - bYear;
        const bMonth = (b.seasonIndex ?? 0) * 3 + 1;
        return (a.monthIndex ?? 1) - bMonth;
      }
      // 3. Both monthly: sort by monthIndex (1 to 12)
      if (a.period === 'MONTHLY' && b.period === 'MONTHLY') {
        const aYear = a.year || today.year;
        const bYear = b.year || today.year;
        if (aYear !== bYear) return aYear - bYear;
        return (a.monthIndex ?? 1) - (b.monthIndex ?? 1);
      }
      // 4. Default: chronological by startDate or createdAt ascending
      return (a.startDate || a.createdAt || '').localeCompare(b.startDate || b.createdAt || '');
    });
  };
  const getTasksForGoal = (goalId: string) => (tasks || []).filter(t => t.goalId === goalId);
  const getHabitsForGoal = (goalId: string) => {
    const goal = cleanGoals.find(g => g.id === goalId);
    const direct = (habits || []).filter(h => h.goalId === goalId);
    if (goal?.period === 'SEASONAL') {
      const parentGoal = goal.parentId
        ? cleanGoals.find(p => p.id === goal.parentId)
        : cleanGoals.find(p => p.period === 'ANNUAL' && p.categoryId === goal.categoryId && (p.year === goal.year || !goal.year));
      if (parentGoal?.period === 'ANNUAL') {
        const annualHabits = (habits || []).filter(h => h.goalId === parentGoal.id && !h.isClosed);
        const directIds = new Set(direct.map(h => h.id));
        const inherited = annualHabits.filter(h => !directIds.has(h.id));
        return [...direct, ...inherited];
      }
    }
    return direct;
  };

  // Available unique years in goals + past viewing years (e.g. today.year - 2, - 1) + next year
  const availableYears = useMemo(() => {
    const setYears = new Set(cleanGoals.map(g => g.year || today.year));
    setYears.add(today.year - 2);
    setYears.add(today.year - 1);
    setYears.add(today.year);
    setYears.add(today.year + 1);
    return Array.from(setYears).sort((a, b) => a - b);
  }, [cleanGoals, today.year]);

  const getStatusBadge = (s: GoalStatus) => {
    switch (s) {
      case 'COMPLETED':
        return { label: 'تکمیل شده', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 };
      case 'IN_PROGRESS':
        return { label: 'در حال انجام', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: PlayCircle };
      case 'PAUSED':
        return { label: 'متوقف', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: PauseCircle };
      case 'NOT_STARTED':
      default:
        return { label: 'شروع نشده', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Circle };
    }
  };

  const getCategory = (catId?: string) => categories.find(c => c.id === catId);

  // Filtered top-level goals by Category, Year, and Search
  const filteredTopLevelGoals = useMemo(() => {
    return topLevelGoals.filter(g => {
      if (selectedCategoryFilter !== 'ALL' && g.categoryId !== selectedCategoryFilter) {
        return false;
      }
      if (selectedYearFilter !== 'ALL' && g.year !== Number(selectedYearFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesDesc = (g.description || '').toLowerCase().includes(q);
        const children = getSubGoals(g.id);
        const matchesChild = children.some(c => 
          c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
        );
        return matchesTitle || matchesDesc || matchesChild;
      }
      return true;
    });
  }, [topLevelGoals, selectedCategoryFilter, selectedYearFilter, searchQuery, cleanGoals]);

  // Seasonal Matrix: grouped by seasonIndex (0: بهار, 1: تابستان, 2: پاییز, 3: زمستان)
  const seasonalGoalsBySeason = useMemo(() => {
    const effYear = selectedYearFilter !== 'ALL' ? Number(selectedYearFilter) : today.year;
    const grouped: Record<number, Array<{ goal: Goal; parentAnnual?: Goal }>> = {
      0: [],
      1: [],
      2: [],
      3: [],
    };

    cleanGoals.forEach(g => {
      if (g.period === 'SEASONAL' && g.seasonIndex !== undefined) {
        const gYear = g.year || today.year;
        if (selectedYearFilter !== 'ALL' && gYear !== effYear) return;
        if (selectedCategoryFilter !== 'ALL' && g.categoryId !== selectedCategoryFilter) return;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matches = g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
          const parent = g.parentId ? cleanGoals.find(p => p.id === g.parentId) : undefined;
          const parentMatches = parent ? parent.title.toLowerCase().includes(q) : false;
          if (!matches && !parentMatches) return;
        }

        const parentAnnual = g.parentId ? cleanGoals.find(p => p.id === g.parentId) : undefined;
        if (g.seasonIndex >= 0 && g.seasonIndex <= 3) {
          grouped[g.seasonIndex].push({ goal: g, parentAnnual });
        }
      }
    });

    return grouped;
  }, [cleanGoals, selectedYearFilter, selectedCategoryFilter, searchQuery, today.year]);

  // Find any past goals (seasonal, monthly, or past year) with pending uncompleted items
  const pastGoalsWithPending = useMemo(() => {
    return cleanGoals.filter(g => {
      let isPast = false;
      if (g.period === 'SEASONAL' && g.seasonIndex !== undefined) {
        isPast = g.year < today.year || (g.year === today.year && g.seasonIndex < currentSeasonIdx);
      } else if (g.period === 'MONTHLY' && g.monthIndex !== undefined) {
        isPast = g.year < today.year || (g.year === today.year && g.monthIndex < today.month);
      } else if (g.period === 'ANNUAL') {
        isPast = g.year < today.year;
      }
      if (!isPast) return false;
      const pendingTasks = (tasks || []).filter(t => t.goalId === g.id && !t.isCompleted);
      const linkedHabits = (habits || []).filter(h => h.goalId === g.id);
      return pendingTasks.length > 0 || linkedHabits.length > 0;
    });
  }, [cleanGoals, today.year, today.month, currentSeasonIdx, tasks, habits]);

  const firstPendingRolloverGoal = pastGoalsWithPending[0];

  const handleOpenTransferModal = (goal: Goal) => {
    setTransferGoal(goal);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-14" dir="rtl">
      {/* Sticky Header & Navigation Toolbar */}
      <div className="sticky -top-5 z-20 pt-5 pb-2.5 bg-[#F8F9F5]/95 backdrop-blur-md space-y-2.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <span>اهداف و برنامه‌ریزی</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {toPersianDigits(goals.length)} هدف
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              اهداف سالانه، گام‌های میانی فصلی و اقدامات اجرایی
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAnnualWizard}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>طراحی هدف سالانه</span>
            </button>

            <button
              type="button"
              onClick={() => onNewGoal(null, 'ANNUAL')}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>هدف جدید</span>
            </button>
          </div>
        </div>

        {/* Navigation & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 text-xs shadow-2xs">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('TREE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'TREE'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5 text-emerald-700" />
              <span>ساختار سالانه</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SEASONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'SEASONS'
                  ? 'bg-white text-amber-950 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-700" />
              <span>تفکیک فصلی (۴ فصل)</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded-full">
                ویژه
              </span>
            </button>
          </div>

          {/* Live Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در اهداف، گام‌های فصلی و ماهانه (مثلاً: دو، شنا...)"
              className="w-full pr-8 pl-8 py-1.5 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white text-xs font-medium text-gray-900 focus:border-emerald-500 outline-hidden placeholder:text-gray-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tree Expand / Collapse Controls */}
          {viewMode === 'TREE' && (
            <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="باز کردن همه اهداف برای دیدن تمام گام‌های فصلی"
              >
                <Eye className="w-3 h-3 text-emerald-600" />
                <span>باز کردن همه</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="بستن کارت‌های اهداف"
              >
                <EyeOff className="w-3 h-3 text-gray-400" />
                <span>بستن همه</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimal Filter Pills: Year & Category */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-gray-200 text-xs shadow-2xs">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            <span className="text-[11px] font-bold text-gray-500 shrink-0 ml-1">سال:</span>
            <button
              type="button"
              onClick={() => setSelectedYearFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                selectedYearFilter === 'ALL'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              همه
            </button>
            {availableYears.map((y) => {
              const isSelected = selectedYearFilter === y;
              const isCurrentYear = y === today.year;
              const isPastYear = y < today.year;
              const isNextYear = y === today.year + 1;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYearFilter(y)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs font-bold'
                      : isCurrentYear
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold'
                      : isPastYear
                      ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {toPersianDigits(y)} {isCurrentYear ? '(امسال)' : isPastYear ? '(آرشیو)' : isNextYear ? '(سال بعد)' : ''}
                </button>
              );
            })}
          </div>

          {/* Category Filter Dropdown (باز شدن کشویی بالا به پایین همانند صفحه عادات) */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-700 font-semibold focus:outline-hidden focus:border-emerald-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">همه دسته‌ها ({toPersianDigits(cleanGoals.length)})</option>
                {categories.map((c) => {
                  const count = cleanGoals.filter(g => g.categoryId === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.title} ({toPersianDigits(count)})
                    </option>
                  );
                })}
              </select>
              {selectedCategoryFilter !== 'ALL' && onDeleteCategory && categories.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const cat = categories.find(c => c.id === selectedCategoryFilter);
                    if (cat) setCategoryToDelete(cat);
                  }}
                  title="حذف این دسته‌بندی"
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Automatic Rollover Notification Banner for Ended Period */}
      {!dismissedRolloverNotice && firstPendingRolloverGoal && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Repeat className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-amber-950 block">انتقال تسک‌ها و عادات دوره پایان‌یافته:</span>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                دوره مربوط به «{firstPendingRolloverGoal.title}» به پایان رسیده و موارد تکمیل‌نشده دارد. مایلید به دوره بعد منتقل شوند؟
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenTransferModal(firstPendingRolloverGoal)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Repeat className="w-3 h-3" />
              <span>انتقال به دوره جدید</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedRolloverNotice(true)}
              className="p-1.5 text-amber-700 hover:text-amber-900 rounded-lg transition-colors cursor-pointer"
              title="بستن پیام"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Goals Cards List */}
      {viewMode === 'SEASONS' ? (
        /* Seasonal View: All 4 seasons laid out with all seasonal goals */
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍂</span>
              <div>
                <h4 className="font-extrabold text-emerald-950">نمای تفکیک فصلی اهداف</h4>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  تمام اهداف میانی فصلی در ۴ فصل سال به همراه تسک‌ها و عادات متصل به آن‌ها
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAnnualWizard}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>هدف‌گذاری سالانه و فصلی</span>
            </button>
          </div>

          {/* Annual Garden Overview Card */}
          <YearGardenOverviewCard
            goals={cleanGoals}
            tasks={tasks}
            habits={habits}
            targetYear={typeof selectedYearFilter === 'number' ? selectedYearFilter : today.year}
          />

          {[0, 1, 2, 3].map((sIdx) => {
            const sConfig = SEASON_CONFIG[sIdx];
            const seasonGoals = seasonalGoalsBySeason[sIdx] || [];
            const isCurrentSeason = sIdx === currentSeasonIdx;
            const seasonMonths = [
              ['فروردین', 'اردیبهشت', 'خرداد'],
              ['تیر', 'مرداد', 'شهریور'],
              ['مهر', 'آبان', 'آذر'],
              ['دی', 'بهمن', 'اسفند'],
            ][sIdx];

            return (
              <div
                key={sIdx}
                className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs space-y-4 ${
                  isCurrentSeason
                    ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Season Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{sConfig.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-gray-900">
                          فصل {sConfig.name}
                        </h3>
                        {isCurrentSeason && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            فصل جاری (اکنون)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        ماه‌های شامل: {seasonMonths.join('، ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                      {toPersianDigits(seasonGoals.length)} هدف فصلی
                    </span>
                    <button
                      type="button"
                      onClick={() => onNewGoal(null, 'SEASONAL', sIdx)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ هدف جدید {sConfig.name}</span>
                    </button>
                  </div>
                </div>

                {/* Seasonal Garden Summary Card */}
                <SeasonGardenCard
                  seasonIndex={sIdx}
                  year={typeof selectedYearFilter === 'number' ? selectedYearFilter : today.year}
                  goals={cleanGoals}
                  tasks={tasks}
                  habits={habits}
                />

                {/* Season Goals List */}
                {seasonGoals.length === 0 ? (
                  <div className="bg-gray-50/70 rounded-xl border border-dashed border-gray-200 p-6 text-center space-y-2">
                    <p className="text-xs text-gray-500">
                      هنوز هدفی برای فصل {sConfig.name} تعریف نشده است.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNewGoal(null, 'SEASONAL', sIdx)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تعریف اولین هدف برای فصل {sConfig.name}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {seasonGoals.map(({ goal: sGoal, parentAnnual }) => {
                      const { progress: sProg, isManual: isSManual } = getEffectiveGoalProgress(sGoal);
                      const sCat = getCategory(sGoal.categoryId) || (parentAnnual ? getCategory(parentAnnual.categoryId) : undefined);
                      const sTasks = getTasksForGoal(sGoal.id);
                      const sHabits = getHabitsForGoal(sGoal.id);
                      const sColor = sGoal.colorHex || sCat?.colorHex || '#10B981';
                      const isSExpanded = expandedGoals[sGoal.id] !== undefined ? expandedGoals[sGoal.id] : false;

                      return (
                        <div
                          key={sGoal.id}
                          onClick={() => { if (!isSExpanded) toggleExpand(sGoal.id); }}
                          className={`bg-white rounded-xl border p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition-all ${!isSExpanded ? 'cursor-pointer hover:bg-gray-50/40' : ''}`}
                          style={{
                            borderColor: `${sColor}40`,
                            borderRightWidth: '4px',
                            borderRightColor: sColor,
                          }}
                        >
                          {/* Top: Title & Parent Tag (Clickable to expand/collapse) */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); toggleExpand(sGoal.id); }}
                            className="space-y-1 cursor-pointer select-none"
                          >
                            {parentAnnual && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                <Target className="w-3 h-3 text-emerald-600" />
                                <span>ذیل هدف سالانه:</span>
                                <span className="font-bold text-gray-800 truncate max-w-[200px]">
                                  {parentAnnual.title}
                                </span>
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-extrabold text-gray-900 leading-snug">
                                {sGoal.title}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[11px] font-bold font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {toPersianDigits(sProg)}٪
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onEditGoal(sGoal)}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                  title="ویرایش"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteGoal(sGoal.id)}
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(sGoal.id)}
                                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                  title={isSExpanded ? 'بستن جزئیات' : 'باز کردن جزئیات'}
                                >
                                  {isSExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Badges */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); toggleExpand(sGoal.id); }}
                            className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] cursor-pointer select-none"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              {sCat && (
                                <span
                                  className="font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                                  style={{
                                    backgroundColor: `${sCat.colorHex}20`,
                                    color: sCat.colorHex,
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sCat.colorHex }} />
                                  <span>{sCat.title}</span>
                                </span>
                              )}
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                                {getStatusBadge(sGoal.status).label}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-semibold">
                              {toPersianDigits(sTasks.length)} تسک • {toPersianDigits(sHabits.length)} عادت
                            </span>
                          </div>

                          {/* Expanded Details: Description, Progress Slider, Tasks and Habits */}
                          {isSExpanded && (
                            <div className="space-y-2.5 pt-2 border-t border-gray-100 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                              {sGoal.description && (
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {sGoal.description}
                                </p>
                              )}

                              {/* Interactive Visual Progress Slider */}
                              <GoalVisualProgressSlider
                                goalId={sGoal.id}
                                progress={sProg}
                                isManual={isSManual}
                                autoProgress={calculateAutoGoalProgress(sGoal.id)}
                                colorHex={sColor}
                                compact
                                onUpdateProgress={onUpdateGoalProgress}
                                onOpenModal={() => setSelectedGoalForProgress(sGoal)}
                              />

                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-500">
                                    تسک‌ها ({toPersianDigits(sTasks.length)}) و عادات ({toPersianDigits(sHabits.length)})
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onNewTaskForGoal(sGoal.id)}
                                      className="text-[10px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                                    >
                                      + تسک
                                    </button>
                                    {onNewHabitForGoal && (
                                      <button
                                        type="button"
                                        onClick={() => onNewHabitForGoal(sGoal.id)}
                                        className="text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                                      >
                                        + عادت
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {sTasks.map((t) => (
                                  <div key={t.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg text-xs">
                                    <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                                      <button type="button" onClick={() => onToggleTask(t.id)} className="text-emerald-600 cursor-pointer shrink-0">
                                        {t.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                      </button>
                                      <span className={`truncate text-[11px] ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                                        {t.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {onDuplicateTask && (
                                        <button
                                          type="button"
                                          onClick={() => onDuplicateTask(t)}
                                          className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                          title="کپی گرفتن از تسک (داپلیکیت)"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setTaskToTransfer(t)}
                                        className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                        title="انتقال یا بستن تسک"
                                      >
                                        <Repeat className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onOpenTimer(t.title, Math.round(t.timerSecondsTarget / 60) || 25, () => onToggleTask(t.id))}
                                        className="p-1 text-gray-400 hover:text-emerald-700 cursor-pointer"
                                        title="تایمر تمرکز"
                                      >
                                        <Play className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {sHabits.map((h) => {
                                  const isDone = Boolean(h.completionHistory?.[todayStr]);
                                  const isAnnualInherited = h.goalId !== sGoal.id;
                                  return (
                                    <div key={h.id} className="flex items-center justify-between p-1.5 bg-amber-50/50 border border-amber-100 rounded-lg text-xs">
                                      <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                                        <button type="button" onClick={() => onToggleHabitToday?.(h.id)} className="text-amber-600 cursor-pointer shrink-0">
                                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5 fill-amber-600 text-white" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                        </button>
                                        <span className="truncate text-[11px] text-gray-800 font-medium">{h.title}</span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {isAnnualInherited && (
                                          <span className="text-[9px] text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                                            عادت سالانه
                                          </span>
                                        )}
                                        <span className="text-[9px] text-amber-800 bg-amber-100 px-1 py-0.2 rounded font-medium">
                                          {h.frequency === 'DAILY' ? 'روزانه' : 'هفتگی'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : cleanGoals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-xs text-gray-400 space-y-3">
          <Target className="w-8 h-8 text-emerald-600/40 mx-auto" />
          <p>هنوز هدفی ثبت نشده است.</p>
          <button
            type="button"
            onClick={onOpenAnnualWizard}
            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>شروع تعریف هدف</span>
          </button>
        </div>
      ) : filteredTopLevelGoals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500 space-y-2">
          <p>هدفی با این فیلتر یا عبارت جستجو یافت نشد.</p>
          <button
            type="button"
            onClick={() => { setSelectedCategoryFilter('ALL'); setSelectedYearFilter('ALL'); setSearchQuery(''); }}
            className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            مشاهده همه اهداف
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Annual Garden Overview Card */}
          <YearGardenOverviewCard
            goals={cleanGoals}
            tasks={tasks}
            habits={habits}
            targetYear={typeof selectedYearFilter === 'number' ? selectedYearFilter : today.year}
          />

          {filteredTopLevelGoals.map((annual) => {
            const { progress: effectiveProgress, isManual } = getEffectiveGoalProgress(annual);
            const subGoals = getSubGoals(annual.id);
            const directTasks = getTasksForGoal(annual.id);
            const directHabits = getHabitsForGoal(annual.id);
            const isExpanded = expandedGoals[annual.id] !== undefined ? expandedGoals[annual.id] : false;
            const statusInfo = getStatusBadge(annual.status);
            const StatusIcon = statusInfo.icon;
            const annualCat = getCategory(annual.categoryId);
            const isCurrentYear = annual.year === today.year;
            const goalColor = annual.colorHex || annualCat?.colorHex || '#10B981';
            const seasonalSubGoals = subGoals.filter(g => g.period === 'SEASONAL');

            return (
              <div
                key={annual.id}
                onClick={() => { if (!isExpanded) toggleExpand(annual.id); }}
                className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all space-y-3.5 ${!isExpanded ? 'cursor-pointer hover:shadow-sm' : ''}`}
                style={{
                  backgroundColor: `${goalColor}12`,
                  borderColor: `${goalColor}40`,
                  borderRightWidth: '6px',
                  borderRightColor: goalColor,
                  boxShadow: `0 4px 14px -3px ${goalColor}20`,
                }}
              >
                {/* Top Row: Title & Actions at the Top */}
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleExpand(annual.id); }}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EntityIcon type="ANNUAL_GOAL" size="sm" />
                      <h3 className="text-base sm:text-lg font-extrabold text-gray-950 tracking-tight">
                        {annual.title}
                      </h3>
                      <span className="text-xs font-extrabold font-mono px-2 py-0.5 rounded-lg bg-white/90 text-gray-900 border border-black/10 shadow-2xs">
                        {toPersianDigits(effectiveProgress)}٪
                      </span>
                    </div>

                    {/* Meta Tags Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                      {/* Entity Type Badge */}
                      <EntityBadge type="ANNUAL_GOAL" size="xs" />

                      {/* Category Badge */}
                      {annualCat && (
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                          style={{
                            backgroundColor: `${annualCat.colorHex}22`,
                            color: annualCat.colorHex,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: annualCat.colorHex }}
                          />
                          <span>{annualCat.title}</span>
                        </span>
                      )}

                      {/* Status */}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusInfo.label}</span>
                      </span>

                      <span className="text-[10px] font-semibold text-gray-600 bg-white/80 px-2 py-0.5 rounded-md border border-black/5">
                        {toPersianDigits(subGoals.length)} هدف میانی • {toPersianDigits(directTasks.length)} تسک • {toPersianDigits(directHabits.length)} عادت
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenTransferModal(annual)}
                      title="انتقال تسک‌ها و عادات این هدف"
                      className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewHistory(annual)}
                      title="تاریخچه"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditGoal(annual)}
                      title="ویرایش"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteGoal(annual.id)}
                      title="حذف"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(annual.id)}
                      title={isExpanded ? 'بستن' : 'باز کردن'}
                      className="p-1.5 text-gray-600 hover:text-gray-900 bg-white/70 hover:bg-white rounded-lg border border-black/5 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub-goals, Description, Progress Slider, and Seasons Strip (Shown when expanded) */}
                {isExpanded && (() => {
                  // Filter seasons that have either a seasonal goal OR monthly goals
                  const activeSeasons = [0, 1, 2, 3].filter(sIdx => {
                    const sGoal = subGoals.find(g => g.period === 'SEASONAL' && g.seasonIndex === sIdx);
                    const mGoals = subGoals.filter(g => g.period === 'MONTHLY' && g.monthIndex && Math.floor((Number(g.monthIndex) - 1) / 3) === sIdx);
                    return Boolean(sGoal || mGoals.length > 0);
                  });

                  return (
                    <div className="pt-2 border-t border-black/10 space-y-3.5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      {annual.description && (
                        <p className="text-xs text-gray-700 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-black/5">
                          {annual.description}
                        </p>
                      )}

                      {/* Prominent Seasonal Steps Chip Strip */}
                      {seasonalSubGoals.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1 shrink-0">
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            <span>گام‌های فصلی ({toPersianDigits(seasonalSubGoals.length)}):</span>
                          </span>
                          {seasonalSubGoals.map((s) => {
                            const sConf = SEASON_CONFIG[s.seasonIndex ?? 0];
                            const isCur = annual.year === today.year && s.seasonIndex === currentSeasonIdx;
                            const { progress: sProg } = getEffectiveGoalProgress(s);
                            return (
                              <div
                                key={s.id}
                                className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                                  isCur
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold ring-1 ring-emerald-400'
                                    : sConf ? sConf.badgeClass : 'bg-white text-gray-800 border-gray-200'
                                }`}
                                title={s.description || s.title}
                              >
                                <span>{sConf?.icon}</span>
                                <span className="font-semibold">{sConf?.name}:</span>
                                <span className="font-bold text-gray-900">{s.title}</span>
                                <span className="text-[9px] bg-black/5 px-1 py-0.2 rounded font-mono font-bold">
                                  %{toPersianDigits(sProg)}
                                </span>
                                {isCur && (
                                  <span className="text-[8px] bg-emerald-700 text-white px-1 rounded font-bold">
                                    اکنون
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Interactive Visual Progress Slider */}
                      <GoalVisualProgressSlider
                        goalId={annual.id}
                        progress={effectiveProgress}
                        isManual={isManual}
                        autoProgress={calculateAutoGoalProgress(annual.id)}
                        colorHex={goalColor}
                        onUpdateProgress={onUpdateGoalProgress}
                        onOpenModal={() => setSelectedGoalForProgress(annual)}
                      />
                      {/* Intermediate Goals Action Row - Single Unified Action */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <span>اهداف میانی ({toPersianDigits(subGoals.length)})</span>
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onNewGoal(annual.id, 'SEASONAL', currentSeasonIdx)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ تعریف هدف میانی</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNewTaskForGoal(annual.id)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ تسک سالانه</span>
                          </button>
                        </div>
                      </div>

                      {/* 4 Seasons Quick Strip for this Annual Goal */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                        {[0, 1, 2, 3].map((sIdx) => {
                          const sConf = SEASON_CONFIG[sIdx];
                          const sGoal = subGoals.find(g => g.period === 'SEASONAL' && g.seasonIndex === sIdx);
                          const mGoals = subGoals.filter(g => g.period === 'MONTHLY' && g.monthIndex && Math.floor((Number(g.monthIndex) - 1) / 3) === sIdx);
                          const hasGoals = Boolean(sGoal || mGoals.length > 0);
                          const isCur = annual.year === today.year && sIdx === currentSeasonIdx;

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                if (!hasGoals) {
                                  onNewGoal(annual.id, 'SEASONAL', sIdx);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                hasGoals
                                  ? isCur
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400 font-extrabold'
                                    : sConf.badgeClass
                                  : 'bg-white text-gray-500 border-dashed border-gray-300 hover:border-emerald-400 hover:text-emerald-700'
                              }`}
                              title={hasGoals ? `فصل ${sConf.name}: ${sGoal ? sGoal.title : 'دارای هدف ماهانه'}` : `افزودن هدف برای فصل ${sConf.name}`}
                            >
                              <span>{sConf.icon}</span>
                              <span>{sConf.name}</span>
                              {hasGoals ? (
                                <span className="text-[9px] bg-black/5 px-1 rounded font-normal">
                                  {sGoal ? sGoal.title : `${toPersianDigits(mGoals.length)} ماهانه`}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-400 font-normal">+ تعریف</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* If no sub-goals exist yet, show clean guidance card */}
                      {activeSeasons.length === 0 ? (
                        <div className="bg-gray-50/70 rounded-xl border border-dashed border-gray-200 p-4 text-center space-y-2">
                          <p className="text-xs text-gray-500">
                            هنوز هدف میانی (فصلی یا ماهانه) برای این هدف تعریف نشده است.
                          </p>
                          <button
                            type="button"
                            onClick={() => onNewGoal(annual.id, 'SEASONAL', currentSeasonIdx)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>تعریف اولین هدف میانی (فصل یا ماه)</span>
                          </button>
                        </div>
                      ) : (
                        /* Only display seasons that have defined goals */
                        <div className="space-y-3.5">
                          {activeSeasons.map((sIdx) => {
                            const sConfig = SEASON_CONFIG[sIdx];
                            const seasonalGoalsForSeason = subGoals.filter(g => g.period === 'SEASONAL' && g.seasonIndex === sIdx);
                            const monthlyGoals = subGoals.filter(g => g.period === 'MONTHLY' && g.monthIndex && Math.floor((Number(g.monthIndex) - 1) / 3) === sIdx);
                            const isPast = annual.year < today.year || (annual.year === today.year && sIdx < currentSeasonIdx);
                            const isCurrent = annual.year === today.year && sIdx === currentSeasonIdx;
                            const pendingTasksForSeason = tasks.filter(t => seasonalGoalsForSeason.some(sg => sg.id === t.goalId) && !t.isCompleted);

                            return (
                              <div
                                key={sIdx}
                                className={`rounded-xl border p-3.5 space-y-3 transition-all ${sConfig.cardBg}`}
                              >
                                {/* Season Header */}
                                <div className="flex items-center justify-between pb-1 border-b border-black/5">
                                  <div className="flex items-center gap-2">
                                    <SeasonBadge seasonIndex={sIdx} showName={true} />
                                    {isCurrent && (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.2 rounded-md">
                                        فصل جاری
                                      </span>
                                    )}
                                    {isPast && (
                                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                        گذشته
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {isPast && pendingTasksForSeason.length > 0 && seasonalGoalsForSeason[0] && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenTransferModal(seasonalGoalsForSeason[0])}
                                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Repeat className="w-2.5 h-2.5" />
                                        <span>انتقال به بعد</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => onNewGoal(annual.id, 'SEASONAL', sIdx)}
                                      className="px-2 py-0.5 bg-white hover:bg-gray-50 text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 rounded-md text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                      title={`تعریف هدف فصلی برای ${sConfig.name}`}
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>+ هدف فصلی</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Seasonal Goals for this season */}
                                {seasonalGoalsForSeason.length === 0 ? (
                                  <div className="bg-white/50 rounded-xl border border-dashed border-gray-300/80 p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => onNewGoal(annual.id, 'SEASONAL', sIdx)}
                                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>تعریف هدف برای فصل {sConfig.name}</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {seasonalGoalsForSeason.map((seasonalGoal) => {
                                      const { progress: subProgress, isManual: isSubManual } = getEffectiveGoalProgress(seasonalGoal);
                                      const subTasks = getTasksForGoal(seasonalGoal.id);
                                      const subHabits = getHabitsForGoal(seasonalGoal.id);

                                      return (
                                        <div key={seasonalGoal.id} className="bg-white/85 rounded-xl border border-black/5 p-3 space-y-2 shadow-2xs">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <EntityIcon type="INTERMEDIATE_GOAL" size="xs" />
                                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                                  هدف فصلی: {seasonalGoal.title}
                                                </h4>
                                                <EntityBadge type="INTERMEDIATE_GOAL" customLabel="فصلی" size="xs" />
                                              </div>

                                              {/* Sequential Continuation Links */}
                                              {seasonalGoal.continuesGoalId && (
                                                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-semibold">
                                                  <span>🔗 در ادامه:</span>
                                                  <span className="truncate max-w-[180px]">
                                                    {goals.find(g => g.id === seasonalGoal.continuesGoalId)?.title || 'هدف فصلی قبل'}
                                                  </span>
                                                </div>
                                              )}

                                              {goals.some(g => g.continuesGoalId === seasonalGoal.id) && (
                                                <div className="mt-1 mr-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                                                  <span>➡️ ادامه یافته در:</span>
                                                  <span className="truncate max-w-[180px]">
                                                    {goals.filter(g => g.continuesGoalId === seasonalGoal.id).map(g => g.title).join('، ')}
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenTransferModal(seasonalGoal)}
                                                title="انتقال تسک‌ها و عادات به دوره بعد"
                                                className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                              >
                                                <Repeat className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => onEditGoal(seasonalGoal)}
                                                title="ویرایش"
                                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => onDeleteGoal(seasonalGoal.id)}
                                                title="حذف"
                                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Interactive Visual Progress Slider */}
                                          <GoalVisualProgressSlider
                                            goalId={seasonalGoal.id}
                                            progress={subProgress}
                                            isManual={isSubManual}
                                            autoProgress={calculateAutoGoalProgress(seasonalGoal.id)}
                                            colorHex="#059669"
                                            compact
                                            onUpdateProgress={onUpdateGoalProgress}
                                            onOpenModal={() => setSelectedGoalForProgress(seasonalGoal)}
                                          />

                                          {/* Actions for Seasonal Goal */}
                                          <div className="flex items-center justify-between pt-1 text-[10px]">
                                            <span className="text-gray-500">
                                              اقدامات: {toPersianDigits(subTasks.length)} تسک | {toPersianDigits(subHabits.length)} عادت
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => onNewTaskForGoal(seasonalGoal.id)}
                                                className="px-2 py-0.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded font-semibold transition-colors cursor-pointer"
                                              >
                                                + تسک
                                              </button>
                                              {onNewHabitForGoal && (
                                                <button
                                                  type="button"
                                                  onClick={() => onNewHabitForGoal(seasonalGoal.id)}
                                                  className="px-2 py-0.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded font-semibold transition-colors cursor-pointer"
                                                >
                                                  + عادت
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {/* Tasks & Habits for seasonal goal */}
                                          {(subTasks.length > 0 || subHabits.length > 0) && (
                                            <div className="space-y-1.5 pt-1 border-t border-black/5">
                                              {subTasks.map((task) => (
                                                <div
                                                  key={task.id}
                                                  className="p-1.5 rounded-lg bg-white/90 border border-black/5 flex items-center justify-between text-xs"
                                                >
                                                  <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                                                    <button
                                                      type="button"
                                                      onClick={() => onToggleTask(task.id)}
                                                      className="cursor-pointer text-emerald-600 shrink-0"
                                                    >
                                                      {task.isCompleted ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
                                                      ) : (
                                                        <Circle className="w-3.5 h-3.5 text-gray-300" />
                                                      )}
                                                    </button>
                                                    <EntityIcon type="TASK" size="xs" showBackground={false} />
                                                    <span className={`truncate text-[11px] ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                                                      {task.title}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => setTaskToTransfer(task)}
                                                      className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                                      title="انتقال یا بستن تسک"
                                                    >
                                                      <Repeat className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => onOpenTimer(task.title, Math.round(task.timerSecondsTarget / 60) || 25, () => onToggleTask(task.id))}
                                                      className="p-1 text-gray-400 hover:text-emerald-700 cursor-pointer"
                                                      title="تایمر تمرکز"
                                                    >
                                                      <Play className="w-2.5 h-2.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}

                                              {subHabits.map((habit) => {
                                                const isDoneToday = Boolean(habit.completionHistory?.[todayStr]);
                                                const isAnnualInherited = habit.goalId !== seasonalGoal.id;
                                                return (
                                                  <div
                                                    key={habit.id}
                                                    className="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs"
                                                  >
                                                    <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                                                      <button
                                                        type="button"
                                                        onClick={() => onToggleHabitToday?.(habit.id)}
                                                        className="cursor-pointer text-amber-600 shrink-0"
                                                      >
                                                        {isDoneToday ? (
                                                          <CheckCircle2 className="w-3.5 h-3.5 fill-amber-600 text-white" />
                                                        ) : (
                                                          <Circle className="w-3.5 h-3.5 text-gray-300" />
                                                        )}
                                                      </button>
                                                      <EntityIcon type="HABIT" size="xs" showBackground={false} />
                                                      <span className="truncate text-[11px] text-gray-800 font-medium">
                                                        {habit.title}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                      {isAnnualInherited && (
                                                        <span className="text-[9px] text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                                                          عادت سالانه
                                                        </span>
                                                      )}
                                                      <span className="text-[9px] text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded shrink-0">
                                                        {habit.frequency === 'DAILY' ? 'روزانه' : 'هفتگی'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Monthly Goals Belonging to This Season - Nested Directly Inside */}
                                {monthlyGoals.length > 0 && (
                                  <div className="space-y-2 pt-1">
                                    <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                      <span>اهداف ماهانه در {sConfig.name}:</span>
                                    </span>

                                    <div className="space-y-2">
                                      {monthlyGoals.map((mGoal) => {
                                        const { progress: mProgress, isManual: isMManual } = getEffectiveGoalProgress(mGoal);
                                        const mTasks = getTasksForGoal(mGoal.id);
                                        const mHabits = getHabitsForGoal(mGoal.id);
                                        const monthNumber = Number(mGoal.monthIndex) || 1;
                                        const monthName = PERSIAN_MONTHS[(monthNumber - 1 + 12) % 12];

                                        return (
                                          <div
                                            key={mGoal.id}
                                            className="bg-white/90 rounded-xl border border-gray-200/90 p-3 space-y-2 shadow-2xs"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800">
                                                    ماه {monthName}
                                                  </span>
                                                  <EntityIcon type="INTERMEDIATE_GOAL" size="xs" />
                                                  <h5 className="text-xs font-bold text-gray-900 truncate">
                                                    {mGoal.title}
                                                  </h5>
                                                  <EntityBadge type="INTERMEDIATE_GOAL" customLabel="ماهانه" size="xs" />
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenTransferModal(mGoal)}
                                                  title="انتقال تسک‌ها و عادات به دوره بعد"
                                                  className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Repeat className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => onEditGoal(mGoal)}
                                                  title="ویرایش"
                                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => onDeleteGoal(mGoal.id)}
                                                  title="حذف"
                                                  className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Interactive Visual Progress Slider */}
                                            <GoalVisualProgressSlider
                                              goalId={mGoal.id}
                                              progress={mProgress}
                                              isManual={isMManual}
                                              autoProgress={calculateAutoGoalProgress(mGoal.id)}
                                              colorHex="#0D9488"
                                              compact
                                              onUpdateProgress={onUpdateGoalProgress}
                                              onOpenModal={() => setSelectedGoalForProgress(mGoal)}
                                            />

                                            {/* Actions for Monthly Goal */}
                                            <div className="flex items-center justify-between pt-1 text-[10px]">
                                              <span className="text-gray-500">
                                                {toPersianDigits(mTasks.length)} تسک | {toPersianDigits(mHabits.length)} عادت
                                              </span>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => onNewTaskForGoal(mGoal.id)}
                                                  className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded font-semibold transition-colors cursor-pointer"
                                                >
                                                  + تسک
                                                </button>
                                                {onNewHabitForGoal && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onNewHabitForGoal(mGoal.id)}
                                                    className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded font-semibold transition-colors cursor-pointer"
                                                  >
                                                    + عادت
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Tasks & Habits for monthly goal */}
                                            {(mTasks.length > 0 || mHabits.length > 0) && (
                                              <div className="space-y-1.5 pt-1 border-t border-black/5">
                                                {mTasks.map((task) => (
                                                  <div
                                                    key={task.id}
                                                    className="p-1.5 rounded-lg bg-white border border-gray-100 flex items-center justify-between text-xs"
                                                  >
                                                    <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                                                      <button
                                                        type="button"
                                                        onClick={() => onToggleTask(task.id)}
                                                        className="cursor-pointer text-teal-600 shrink-0"
                                                      >
                                                        {task.isCompleted ? (
                                                          <CheckCircle2 className="w-3.5 h-3.5 fill-teal-600 text-white" />
                                                        ) : (
                                                          <Circle className="w-3.5 h-3.5 text-gray-300" />
                                                        )}
                                                      </button>
                                                      <EntityIcon type="TASK" size="xs" showBackground={false} />
                                                      <span className={`truncate text-[11px] ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                                                        {task.title}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                      {onDuplicateTask && (
                                                        <button
                                                          type="button"
                                                          onClick={() => onDuplicateTask(task)}
                                                          className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                                          title="کپی گرفتن از تسک (داپلیکیت)"
                                                        >
                                                          <Copy className="w-3 h-3" />
                                                        </button>
                                                      )}
                                                      <button
                                                        type="button"
                                                        onClick={() => setTaskToTransfer(task)}
                                                        className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                                        title="انتقال یا بستن تسک"
                                                      >
                                                        <Repeat className="w-3 h-3" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => onOpenTimer(task.title, Math.round(task.timerSecondsTarget / 60) || 25, () => onToggleTask(task.id))}
                                                        className="p-1 text-gray-400 hover:text-teal-700 cursor-pointer"
                                                        title="تایمر تمرکز"
                                                      >
                                                        <Play className="w-2.5 h-2.5" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))}

                                                {mHabits.map((habit) => {
                                                  const isDoneToday = Boolean(habit.completionHistory?.[todayStr]);
                                                  return (
                                                    <div
                                                      key={habit.id}
                                                      className="p-1.5 rounded-lg bg-teal-50/50 border border-teal-100 flex items-center justify-between text-xs"
                                                    >
                                                      <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                                                        <button
                                                          type="button"
                                                          onClick={() => onToggleHabitToday?.(habit.id)}
                                                          className="cursor-pointer text-amber-600 shrink-0"
                                                        >
                                                          {isDoneToday ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 fill-amber-600 text-white" />
                                                          ) : (
                                                            <Circle className="w-3.5 h-3.5 text-gray-300" />
                                                          )}
                                                        </button>
                                                        <EntityIcon type="HABIT" size="xs" showBackground={false} />
                                                        <span className="truncate text-[11px] text-gray-800 font-medium">
                                                          {habit.title}
                                                        </span>
                                                      </div>
                                                      <span className="text-[9px] text-teal-800 bg-teal-100 px-1 py-0.2 rounded shrink-0">
                                                        {habit.frequency === 'DAILY' ? 'روزانه' : 'هفتگی'}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Direct Annual Tasks & Habits */}
                      {(directTasks.length > 0 || directHabits.length > 0) && (
                        <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5 text-xs">
                          <span className="font-bold text-blue-950 text-[11px] block">
                            تسک‌ها و عادات مستقیم هدف سالانه:
                          </span>
                          <div className="space-y-1">
                            {directTasks.map((t) => (
                              <div key={t.id} className="p-1.5 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                                  <button type="button" onClick={() => onToggleTask(t.id)} className="cursor-pointer text-blue-600 shrink-0">
                                    {t.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 fill-blue-600 text-white" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                  </button>
                                  <EntityIcon type="TASK" size="xs" showBackground={false} />
                                  <span className={t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}>{t.title}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onDuplicateTask && (
                                    <button
                                      type="button"
                                      onClick={() => onDuplicateTask(t)}
                                      className="p-1 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                      title="کپی گرفتن از تسک (داپلیکیت)"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setTaskToTransfer(t)}
                                    className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                    title="انتقال یا بستن تسک (انتقال به فصلی یا سالانه)"
                                  >
                                    <Repeat className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenTimer(t.title, Math.round(t.timerSecondsTarget / 60) || 25, () => onToggleTask(t.id))}
                                    className="p-1 text-gray-400 hover:text-blue-700 cursor-pointer"
                                    title="تایمر تمرکز"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {directHabits.map((h) => (
                              <div key={h.id} className="p-1.5 bg-white rounded-lg border border-amber-100 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                                  <button type="button" onClick={() => onToggleHabitToday?.(h.id)} className="cursor-pointer text-amber-600 shrink-0">
                                    {h.completionHistory?.[todayStr] ? <CheckCircle2 className="w-3.5 h-3.5 fill-amber-600 text-white" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                  </button>
                                  <EntityIcon type="HABIT" size="xs" showBackground={false} />
                                  <span className="truncate">{h.title}</span>
                                </div>
                                <span className="text-[9px] text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded font-bold shrink-0">
                                  جاری در تمام فصول
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Edit Modal */}
      <GoalProgressModal
        isOpen={Boolean(selectedGoalForProgress)}
        goal={selectedGoalForProgress}
        autoProgress={selectedGoalForProgress ? calculateAutoGoalProgress(selectedGoalForProgress.id) : 0}
        onClose={() => setSelectedGoalForProgress(null)}
        onSave={(goalId, manualProgress, isManualActive) => {
          onUpdateGoalProgress?.(goalId, manualProgress, isManualActive);
        }}
      />

      {/* Transfer Items Modal */}
      <TransferPeriodItemsModal
        isOpen={Boolean(transferGoal)}
        fromGoal={transferGoal}
        goals={goals}
        tasks={tasks}
        habits={habits}
        categories={categories}
        onClose={() => setTransferGoal(null)}
        onConfirmTransfer={(fromGoalId, targetGoalId, options) => {
          onTransferGoalItems?.(fromGoalId, targetGoalId, options);
          setTransferGoal(null);
        }}
        onCreateTargetAndTransfer={(fromGoal, targetTitle, targetPeriod, targetSeasonIndex, targetMonthIndex, targetYear) => {
          onCreateTargetAndTransfer?.(fromGoal, targetTitle, targetPeriod, targetSeasonIndex, targetMonthIndex, targetYear);
          setTransferGoal(null);
        }}
        onClosePendingItems={(fromGoalId) => {
          onCloseGoalPendingItems?.(fromGoalId);
          setTransferGoal(null);
        }}
      />

      {/* Transfer or Close Single Task Modal */}
      <TransferTaskModal
        isOpen={Boolean(taskToTransfer)}
        task={taskToTransfer}
        goals={goals}
        categories={categories}
        onClose={() => setTaskToTransfer(null)}
        onTransfer={(taskId, targetGoalId, closeTask, noteAppend) => {
          if (onTransferTask) {
            onTransferTask(taskId, targetGoalId, closeTask, noteAppend);
          }
          setTaskToTransfer(null);
        }}
        onCreateSeasonalGoalAndTransfer={(taskId, seasonIdx, year, title, parentAnnualId, categoryId) => {
          if (onCreateSeasonalGoalAndTransfer) {
            onCreateSeasonalGoalAndTransfer(taskId, seasonIdx, year, title, parentAnnualId, categoryId);
          }
          setTaskToTransfer(null);
        }}
      />

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-rose-100 animate-scale-up space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">حذف دسته‌بندی</h3>
                <p className="text-xs text-gray-500">
                  آیا از حذف دسته «{categoryToDelete.title}» اطمینان دارید؟
                </p>
              </div>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
              تمام اهداف، تسک‌ها و عادت‌های این دسته به صورت خودکار به دسته‌بندی پیش‌فرض دیگری منتقل خواهند شد تا هیچ موردی از بین نرود.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCategory && categoryToDelete) {
                    onDeleteCategory(categoryToDelete.id);
                    setSelectedCategoryFilter('ALL');
                    setCategoryToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                تایید و حذف دسته
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
