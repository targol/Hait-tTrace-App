import { Goal, AppTask, Habit } from '../types';
import { parseJalaliString, getTodayJalali, toPersianDigits, PERSIAN_MONTHS } from '../calendar/jalali';

export interface SeasonGardenSummary {
  seasonIndex: number; // 0: بهار, 1: تابستان, 2: پاییز, 3: زمستان
  seasonName: string;
  icon: string;
  monthsText: string;
  months: number[];
  focalPlant: string;
  climateDescription: string;
  weatherStatus: string;
  goalsCount: number;
  completedGoalsCount: number;
  goalsProgressPercent: number;
  tasksCount: number;
  completedTasksCount: number;
  tasksProgressPercent: number;
  habitWateringDaysCount: number;
  overallProgressPercent: number;
  botanicalStage: 'SEED' | 'SPROUT' | 'BUDDING' | 'FLOWERING' | 'FULL_BLOOM';
  botanicalStageTitle: string;
}

export interface YearGardenSummary {
  year: number;
  focalPlant: string;
  climateDescription: string;
  weatherStatus: string;
  overallProgressPercent: number;
  annualGoalsCount: number;
  completedAnnualGoalsCount: number;
  allGoalsCount: number;
  totalTasksCount: number;
  completedTasksCount: number;
  totalHabitWaterings: number;
  seasons: SeasonGardenSummary[];
  botanicalStage: 'SEED' | 'SPROUT' | 'BUDDING' | 'FLOWERING' | 'FULL_BLOOM';
  botanicalStageTitle: string;
}

export const SEASON_META = [
  {
    index: 0,
    name: 'بهار',
    icon: '🌸',
    months: [1, 2, 3],
    monthsText: 'فروردین، اردیبهشت، خرداد',
    defaultPlant: 'ریحان و نعنا',
    altPlant: 'ارکیده',
    climate: 'نسیم بهاری، باران حیات‌بخش و طراوت جوانه‌ها',
    accentColor: '#10B981',
    bgGradient: 'from-emerald-50 to-teal-50/50',
    borderClass: 'border-emerald-200',
  },
  {
    index: 1,
    name: 'تابستان',
    icon: '☀️',
    months: [4, 5, 6],
    monthsText: 'تیر، مرداد، شهریور',
    defaultPlant: 'آفتابگردان',
    altPlant: 'بامبو شانس',
    climate: 'آفتاب زرین، تابش پرحرارت و رشد حداکثری',
    accentColor: '#F59E0B',
    bgGradient: 'from-amber-50 to-yellow-50/50',
    borderClass: 'border-amber-200',
  },
  {
    index: 2,
    name: 'پاییز',
    icon: '🍂',
    months: [7, 8, 9],
    monthsText: 'مهر، آبان، آذر',
    defaultPlant: 'بونسای',
    altPlant: 'برگ انجیری',
    climate: 'هوای معتدل پاییزی، تثبیت ثمره‌ها و آرامش ذهن',
    accentColor: '#EA580C',
    bgGradient: 'from-orange-50 to-amber-50/50',
    borderClass: 'border-orange-200',
  },
  {
    index: 3,
    name: 'زمستان',
    icon: '❄️',
    months: [10, 11, 12],
    monthsText: 'دی، بهمن، اسفند',
    defaultPlant: 'درختچه زیتون',
    altPlant: 'کاکتوس گلدار',
    climate: 'استقامت آرام در سرما، پیوند ریشه‌ها و امید بهار',
    accentColor: '#0284C7',
    bgGradient: 'from-sky-50 to-blue-50/50',
    borderClass: 'border-sky-200',
  },
];

export function getSeasonForMonth(month: number): number {
  if (month <= 3) return 0;
  if (month <= 6) return 1;
  if (month <= 9) return 2;
  return 3;
}

export function getBotanicalStageFromPercent(percent: number): {
  stage: 'SEED' | 'SPROUT' | 'BUDDING' | 'FLOWERING' | 'FULL_BLOOM';
  title: string;
} {
  if (percent >= 90) {
    return { stage: 'FULL_BLOOM', title: 'باغ به ثمر نشسته و شکوفا' };
  } else if (percent >= 65) {
    return { stage: 'FLOWERING', title: 'شاخه‌های پربار و گل‌های خندان' };
  } else if (percent >= 40) {
    return { stage: 'BUDDING', title: 'نهال استوار با غنچه‌های تازه' };
  } else if (percent >= 15) {
    return { stage: 'SPROUT', title: 'جوانه سبز و باطراوت' };
  } else {
    return { stage: 'SEED', title: 'بذر در خاک مستعد در انتظار آب' };
  }
}

/**
 * Calculate the comprehensive botanical garden summary for a specific season.
 */
export function calculateSeasonGardenSummary(
  seasonIndex: number,
  year: number,
  goals: Goal[] = [],
  tasks: AppTask[] = [],
  habits: Habit[] = []
): SeasonGardenSummary {
  const meta = SEASON_META[seasonIndex] || SEASON_META[0];
  const months = meta.months;
  const monthSet = new Set(months);

  // 1. Seasonal Goals
  const isGoalInSeason = (g: Goal): boolean => {
    if (!g) return false;
    const gYear = g.year || year;
    if (gYear !== year) return false;

    // Direct check if seasonal
    if (g.period === 'SEASONAL') {
      if (g.seasonIndex !== undefined && g.seasonIndex !== null) {
        if (Number(g.seasonIndex) === seasonIndex) return true;
      }
      // If seasonIndex matches date or is missing, check startDate or targetDate
      if (g.startDate) {
        const parsed = parseJalaliString(g.startDate);
        if (parsed && parsed.year === year && monthSet.has(parsed.month)) {
          return true;
        }
      }
      if (g.targetDate) {
        const parsed = parseJalaliString(g.targetDate);
        if (parsed && parsed.year === year && monthSet.has(parsed.month)) {
          return true;
        }
      }
    } else if (g.period === 'MONTHLY') {
      if (g.monthIndex !== undefined && g.monthIndex !== null) {
        if (monthSet.has(Number(g.monthIndex))) return true;
      }
      if (g.startDate) {
        const parsed = parseJalaliString(g.startDate);
        if (parsed && parsed.year === year && monthSet.has(parsed.month)) {
          return true;
        }
      }
    }

    // Check if tasks of this goal are in this season
    const linkedTasks = tasks.filter(t => t && t.goalId === g.id);
    if (linkedTasks.length > 0 && g.period === 'SEASONAL') {
      const hasTaskInSeason = linkedTasks.some(t => {
        const d = t.dueDate || t.completedAt;
        if (!d) return false;
        const p = parseJalaliString(d);
        return p && p.year === year && monthSet.has(p.month);
      });
      if (hasTaskInSeason && (g.seasonIndex === undefined || g.seasonIndex === null || linkedTasks.length > 0)) {
        // If all or primary tasks fall into this season's months
        const seasonTasksCount = linkedTasks.filter(t => {
          const d = t.dueDate || t.completedAt;
          const p = d ? parseJalaliString(d) : null;
          return p && p.year === year && monthSet.has(p.month);
        }).length;
        if (seasonTasksCount >= linkedTasks.length / 2) {
          return true;
        }
      }
    }

    return false;
  };

  const isGoalCompleted = (g: Goal): boolean => {
    if (g.status === 'COMPLETED') return true;
    if (g.isManualProgressActive && g.manualProgress === 100) return true;
    const linkedTasks = tasks.filter(t => t && t.goalId === g.id);
    if (linkedTasks.length > 0 && linkedTasks.every(t => t.isCompleted)) {
      return true;
    }
    return false;
  };

  const seasonalGoals = goals.filter(isGoalInSeason);
  const goalsCount = seasonalGoals.length;
  const completedGoalsCount = seasonalGoals.filter(isGoalCompleted).length;
  
  // Calculate average progress of seasonal goals
  let goalsProgressSum = 0;
  if (goalsCount > 0) {
    seasonalGoals.forEach(g => {
      if (isGoalCompleted(g)) {
        goalsProgressSum += 100;
      } else if (g.isManualProgressActive && typeof g.manualProgress === 'number') {
        goalsProgressSum += g.manualProgress;
      } else {
        const linkedTasks = tasks.filter(t => t && t.goalId === g.id);
        if (linkedTasks.length > 0) {
          const completedCount = linkedTasks.filter(t => t.isCompleted).length;
          goalsProgressSum += Math.round((completedCount / linkedTasks.length) * 100);
        } else if (g.status === 'IN_PROGRESS') {
          goalsProgressSum += 50;
        } else {
          goalsProgressSum += 10;
        }
      }
    });
  }
  const goalsProgressPercent = goalsCount > 0 ? Math.round(goalsProgressSum / goalsCount) : 0;

  // 2. Tasks linked to this season
  // Match tasks either by:
  // - Due date or completion date falling into this season's months in this year
  // - Or linked to a goal of this season
  const seasonalGoalIds = new Set(seasonalGoals.map(g => g.id));
  const seasonTasks = tasks.filter(t => {
    if (!t) return false;
    const dateStr = t.dueDate || t.completedAt;
    if (dateStr) {
      const parsed = parseJalaliString(dateStr);
      if (parsed && parsed.year === year && monthSet.has(parsed.month)) {
        return true;
      }
    }
    if (t.goalId && seasonalGoalIds.has(t.goalId)) return true;

    return false;
  });

  const tasksCount = seasonTasks.length;
  const completedTasksCount = seasonTasks.filter(t => t.isCompleted).length;
  const tasksProgressPercent = tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : 0;

  // 3. Habits watering in this season's months
  let habitWateringDaysCount = 0;
  habits.forEach(h => {
    if (!h || !h.completionHistory) return;
    Object.entries(h.completionHistory).forEach(([dateStr, isDone]) => {
      if (!isDone) return;
      const parsed = parseJalaliString(dateStr);
      if (parsed && parsed.year === year && monthSet.has(parsed.month)) {
        habitWateringDaysCount++;
      }
    });
  });

  // 4. Combined Seasonal Progress
  let weightedProgress = 0;
  let weightsTotal = 0;

  if (goalsCount > 0) {
    weightedProgress += goalsProgressPercent * 0.45;
    weightsTotal += 0.45;
  }
  if (tasksCount > 0) {
    weightedProgress += tasksProgressPercent * 0.35;
    weightsTotal += 0.35;
  }
  if (habits.length > 0) {
    // 90 days in a season * number of habits
    const maxHabitScore = Math.max(1, habits.length * 30);
    const habitPercent = Math.min(100, Math.round((habitWateringDaysCount / maxHabitScore) * 100));
    weightedProgress += habitPercent * 0.20;
    weightsTotal += 0.20;
  }

  const overallProgressPercent = weightsTotal > 0 ? Math.min(100, Math.round(weightedProgress / weightsTotal)) : 0;

  const { stage: botanicalStage, title: botanicalStageTitle } = getBotanicalStageFromPercent(overallProgressPercent);

  // Determine weather status
  let weatherStatus = 'هوای معتدل و مساعد برای پرورش باغچه';
  if (overallProgressPercent >= 80) {
    weatherStatus = meta.index === 0 
      ? 'بهار دل‌انگیز، گل‌های خندان و باطراوت' 
      : meta.index === 1 
      ? 'آفتاب زرین و باروری در اوج درخشش' 
      : meta.index === 2 
      ? 'پاییز رنگارنگ با ثمربخشی و ثبات عالی' 
      : 'زمستان پرامید با ریشه‌های مقاوم و پایدار';
  } else if (overallProgressPercent < 25) {
    weatherStatus = 'نیازمند آبیاری بیشتر و مراقبت مداوم روزانه';
  }

  return {
    seasonIndex,
    seasonName: meta.name,
    icon: meta.icon,
    monthsText: meta.monthsText,
    months,
    focalPlant: overallProgressPercent >= 60 ? meta.defaultPlant : meta.altPlant,
    climateDescription: meta.climate,
    weatherStatus,
    goalsCount,
    completedGoalsCount,
    goalsProgressPercent,
    tasksCount,
    completedTasksCount,
    tasksProgressPercent,
    habitWateringDaysCount,
    overallProgressPercent,
    botanicalStage,
    botanicalStageTitle,
  };
}

/**
 * Calculate the comprehensive botanical garden summary for an entire year (یک سال کامل).
 */
export function calculateYearGardenSummary(
  year: number,
  goals: Goal[] = [],
  tasks: AppTask[] = [],
  habits: Habit[] = []
): YearGardenSummary {
  // 1. Calculate for each of the 4 seasons
  const seasons = [0, 1, 2, 3].map(idx => 
    calculateSeasonGardenSummary(idx, year, goals, tasks, habits)
  );

  // 2. Annual Goals
  const annualGoals = goals.filter(g => {
    if (!g) return false;
    const gYear = g.year || year;
    return gYear === year && g.period === 'ANNUAL';
  });

  const allYearGoals = goals.filter(g => {
    if (!g) return false;
    const gYear = g.year || year;
    return gYear === year;
  });

  const annualGoalsCount = annualGoals.length;
  const completedAnnualGoalsCount = annualGoals.filter(g => g.status === 'COMPLETED').length;

  // 3. Tasks in this year
  const yearTasks = tasks.filter(t => {
    if (!t) return false;
    const dateStr = t.dueDate || t.completedAt;
    if (dateStr) {
      const parsed = parseJalaliString(dateStr);
      if (parsed && parsed.year === year) return true;
    }
    return false;
  });

  const totalTasksCount = yearTasks.length;
  const completedTasksCount = yearTasks.filter(t => t.isCompleted).length;

  // 4. Habit waterings in this year
  let totalHabitWaterings = 0;
  habits.forEach(h => {
    if (!h || !h.completionHistory) return;
    Object.entries(h.completionHistory).forEach(([dateStr, isDone]) => {
      if (!isDone) return;
      const parsed = parseJalaliString(dateStr);
      if (parsed && parsed.year === year) {
        totalHabitWaterings++;
      }
    });
  });

  // 5. Overall Annual Progress
  const seasonsAverage = Math.round(
    seasons.reduce((acc, s) => acc + s.overallProgressPercent, 0) / 4
  );

  let annualGoalsProgress = 0;
  if (annualGoalsCount > 0) {
    const sum = annualGoals.reduce((acc, g) => {
      if (g.status === 'COMPLETED') return acc + 100;
      if (g.isManualProgressActive && typeof g.manualProgress === 'number') return acc + g.manualProgress;
      if (g.status === 'IN_PROGRESS') return acc + 50;
      return acc + 15;
    }, 0);
    annualGoalsProgress = Math.round(sum / annualGoalsCount);
  }

  const overallProgressPercent = annualGoalsCount > 0 
    ? Math.round(seasonsAverage * 0.5 + annualGoalsProgress * 0.5)
    : seasonsAverage;

  const { stage: botanicalStage, title: botanicalStageTitle } = getBotanicalStageFromPercent(overallProgressPercent);

  let weatherStatus = 'باغچه سالانه در مسیر رشد متوازن و پیوسته';
  if (overallProgressPercent >= 85) {
    weatherStatus = 'سال شکوفایی بزرگ و به ثمر نشستن درختان کهنسال';
  } else if (overallProgressPercent >= 60) {
    weatherStatus = 'اقلیم پربار و برکت پایدار در طول چهار فصل';
  } else if (overallProgressPercent < 25) {
    weatherStatus = 'نهال سالانه در مراحل آغازین ریشه‌دوانی';
  }

  return {
    year,
    focalPlant: 'درختچه زیتون',
    climateDescription: `بررسی جامع چهار فصل سال ${toPersianDigits(year)} و تجمیع میوه‌های تلاش`,
    weatherStatus,
    overallProgressPercent,
    annualGoalsCount,
    completedAnnualGoalsCount,
    allGoalsCount: allYearGoals.length,
    totalTasksCount,
    completedTasksCount,
    totalHabitWaterings,
    seasons,
    botanicalStage,
    botanicalStageTitle,
  };
}
