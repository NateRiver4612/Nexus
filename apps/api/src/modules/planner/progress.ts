import type { TaskStatus } from '@nexus/db';

/**
 * Simple-count project progress: percentage of completed tasks over total.
 * Returns an integer 0-100 (0 when there are no tasks yet).
 */
export function calculateProjectProgress(tasks: Array<{ status: TaskStatus }>): number {
  if (tasks.length === 0) return 0;

  const completed = tasks.filter((task) => task.status === 'completed').length;
  return Math.min(100, Math.round((completed / tasks.length) * 100));
}
