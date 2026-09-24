import { formatDue } from './format';
import { MINUTE, remainingEffortMs } from './time';
import type { Associate, PriorityClass, Task } from './types';

export const WEIGHTS = {
  severity: 0.3,
  deadline: 0.3,
  customer: 0.15,
  aging: 0.1,
  skill: 0.1,
  proximity: 0.05,
} as const;

export type Factor = keyof typeof WEIGHTS;

/** P1–P3 map to a severity input. P0 bypasses scoring entirely. */
const SEVERITY: Record<Exclude<PriorityClass, 'P0'>, number> = { P1: 1, P2: 0.6, P3: 0.2 };

/** Slack at or above this window means no deadline pressure. */
const DEADLINE_WINDOW = 30 * MINUTE;
/** A task waiting this long gets the full aging score. */
const AGING_WINDOW = 60 * MINUTE;

/** Minimum score gap before a waiting task should interrupt the current one (avoids thrashing). */
export const PREEMPT_GAP = 0.15;

export type RankedTask = {
  task: Task;
  /** Weighted score in 0–1. P0 tasks always rank above any score. */
  score: number;
  /** Each factor in 0–1, before weighting. */
  factors: Record<Factor, number>;
  reason: string;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 1 - slack / 30min, where slack = time to due minus remaining effort (least-slack-first). */
export function deadlinePressure(task: Task, now: number): number {
  if (task.dueAt === undefined) return 0;
  const slack = task.dueAt - now - remainingEffortMs(task, now);
  return clamp01(1 - slack / DEADLINE_WINDOW);
}

export function scoreTask(task: Task, associate: Associate, now: number): RankedTask {
  const factors: Record<Factor, number> = {
    severity: task.priority === 'P0' ? 1 : SEVERITY[task.priority],
    deadline: deadlinePressure(task, now),
    customer: clamp01(task.customerImpact),
    aging: clamp01((now - task.createdAt) / AGING_WINDOW),
    skill: associate.skills.includes(task.type) ? 1 : 0.5,
    proximity: task.location !== undefined && task.location === associate.location ? 1 : 0.5,
  };

  const score = (Object.keys(WEIGHTS) as Factor[]).reduce(
    (sum, f) => sum + WEIGHTS[f] * factors[f],
    0,
  );

  return { task, score, factors, reason: explain(task, factors, now) };
}

/** Short, human-readable reason for a task's rank. Rules are checked in order. */
function explain(task: Task, factors: Record<Factor, number>, now: number): string {
  if (task.priority === 'P0') return 'P0 — safety';
  if (factors.deadline >= 0.5) return formatDue(task.dueAt, now) ?? 'Due soon';
  if (factors.customer >= 0.7) return 'Customer waiting';
  if (factors.aging >= 0.75) return `Waiting ${Math.round((now - task.createdAt) / MINUTE)} min`;
  if (task.priority === 'P1') return 'High priority';
  if (task.priority === 'P3') return 'Low priority, when free';
  return 'Scheduled work';
}

const RANKABLE = new Set(['READY', 'ASSIGNED']);

/** Tasks the associate could pick up next, best first. P0 always wins, then highest score. */
export function rankTasks(tasks: Task[], associate: Associate, now: number): RankedTask[] {
  return tasks
    .filter((t) => RANKABLE.has(t.state))
    .filter((t) => t.assigneeId === undefined || t.assigneeId === associate.id)
    .map((t) => scoreTask(t, associate, now))
    .sort((a, b) => {
      const p0 = Number(b.task.priority === 'P0') - Number(a.task.priority === 'P0');
      if (p0 !== 0) return p0;
      if (b.score !== a.score) return b.score - a.score;
      return (a.task.dueAt ?? Infinity) - (b.task.dueAt ?? Infinity);
    });
}

/** Whether `candidate` is enough more urgent than `current` to interrupt it. */
export function shouldPreempt(current: RankedTask, candidate: RankedTask): boolean {
  if (candidate.task.priority === 'P0') return current.task.priority !== 'P0';
  if (current.task.priority === 'P0') return false;
  return candidate.score - current.score >= PREEMPT_GAP;
}
