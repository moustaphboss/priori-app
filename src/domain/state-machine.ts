import type { Task, TaskState } from './types';

const TRANSITIONS: Record<TaskState, TaskState[]> = {
  PLANNED: ['READY', 'CANCELLED'],
  READY: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'READY', 'CANCELLED'],
  IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['IN_PROGRESS', 'CANCELLED'],
  ESCALATED: ['ASSIGNED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const TERMINAL: TaskState[] = ['COMPLETED', 'CANCELLED'];

export function canTransition(from: TaskState, to: TaskState): boolean {
  // Any live task can be escalated.
  if (to === 'ESCALATED') return from !== 'ESCALATED' && !TERMINAL.includes(from);
  return TRANSITIONS[from].includes(to);
}

/** Returns the task in its new state, keeping time tracking consistent. Throws on an illegal move. */
export function transition(task: Task, to: TaskState, now: number): Task {
  if (!canTransition(task.state, to)) {
    throw new Error(`Illegal transition ${task.state} -> ${to} (task ${task.id})`);
  }

  const next: Task = { ...task, state: to };

  if (task.state === 'IN_PROGRESS') {
    next.workedMs = task.workedMs + (now - (task.startedAt ?? now));
    next.startedAt = undefined;
  }
  if (to === 'PAUSED') next.pausedAt = now;
  if (to === 'IN_PROGRESS') {
    next.startedAt = now;
    next.pausedAt = undefined;
  }
  if (to === 'COMPLETED') next.completedAt = now;

  return next;
}
