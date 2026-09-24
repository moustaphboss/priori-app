import type { Task } from './types';

export const MINUTE = 60_000;

/** Total time worked on a task, including the running session. */
export function elapsedMs(task: Task, now: number): number {
  const running = task.startedAt === undefined ? 0 : now - task.startedAt;
  return task.workedMs + running;
}

export function remainingEffortMs(task: Task, now: number): number {
  return Math.max(0, task.estimatedMinutes * MINUTE - elapsedMs(task, now));
}
