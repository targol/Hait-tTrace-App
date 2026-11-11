export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'HIGH', label: 'مهم', color: '#dc2626' },
  { id: 'MEDIUM', label: 'متوسط', color: '#f59e0b' },
  { id: 'LOW', label: 'عادی', color: '#16a34a' },
];

export function priorityOf(task: { priority?: TaskPriority | null; isImportant?: boolean }): TaskPriority | undefined {
  return task.priority ?? (task.isImportant ? 'HIGH' : undefined);
}

export function priorityInfo(p?: TaskPriority | null) {
  return PRIORITIES.find(x => x.id === p);
}
