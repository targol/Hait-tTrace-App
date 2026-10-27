import { Category, Goal, AppTask, Habit } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-work', title: 'کاری و تحصیلی', colorHex: '#10B981', iconName: 'Briefcase', plantType: 'بونسای' },
  { id: 'cat-personal', title: 'توسعه فردی', colorHex: '#3B82F6', iconName: 'BookOpen', plantType: 'نیلوفر آبی' },
  { id: 'cat-health', title: 'سلامت و ورزش', colorHex: '#EF4444', iconName: 'HeartPulse', plantType: 'برگ انجیری' },
  { id: 'cat-home', title: 'خانه و زندگی', colorHex: '#F59E0B', iconName: 'Home', plantType: 'کاکتوس گلدار' },
];

export function getInitialGoals(): Goal[] {
  // Empty by default: user-defined goals only, no arbitrary dummy goals
  return [];
}

export function getInitialTasks(): AppTask[] {
  // Empty by default: user-defined tasks only, no arbitrary dummy tasks
  return [];
}

export function getInitialHabits(): Habit[] {
  // Empty by default: user-defined habits only, no arbitrary dummy habits
  return [];
}
