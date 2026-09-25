import type { Task, TaskState } from './types';

/** A P0 must be acknowledged within this window or it escalates. */
export const P0_ACK_WINDOW_MS = 30_000;

const AWAITING_STATES: TaskState[] = ['READY', 'ASSIGNED', 'ESCALATED'];

/** P0 that nobody has acknowledged yet (including ones already escalated). */
export function awaitingAck(task: Task): boolean {
  return (
    task.priority === 'P0' &&
    task.acknowledgedAt === undefined &&
    AWAITING_STATES.includes(task.state)
  );
}

/** The window runs from when the alert was raised, or from the last manager reassignment. */
export function ackRemainingMs(task: Task, now: number): number {
  const windowStart = Math.max(task.createdAt, task.assignedAt ?? 0);
  return Math.max(0, windowStart + P0_ACK_WINDOW_MS - now);
}

/** Unacknowledged P0 whose window has run out and hasn't been escalated yet. */
export function shouldEscalate(task: Task, now: number): boolean {
  return awaitingAck(task) && task.state !== 'ESCALATED' && ackRemainingMs(task, now) === 0;
}
