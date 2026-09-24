export type TaskState =
  | 'PLANNED'
  | 'READY'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ESCALATED';

/** P0 = safety/hygiene/emergency, always wins. P1–P3 are ranked by weighted score. */
export type PriorityClass = 'P0' | 'P1' | 'P2' | 'P3';

export type TaskType = 'restock' | 'check' | 'spill' | 'bopis' | 'customer';

export type TaskOrigin = 'planned' | 'adhoc';

export type TaskAction = 'start' | 'pause' | 'resume' | 'complete';

export type Task = {
  id: string;
  title: string;
  type: TaskType;
  origin: TaskOrigin;
  priority: PriorityClass;
  state: TaskState;
  /** Where in the store, e.g. "Aisle 7". */
  location?: string;
  /** Epoch ms. Undefined when the task has no deadline. */
  dueAt?: number;
  estimatedMinutes: number;
  /** 0–1: how directly a customer is affected or waiting. */
  customerImpact: number;
  assigneeId?: string;
  /** Epoch ms. */
  createdAt: number;
  /** Time spent in finished IN_PROGRESS sessions. */
  workedMs: number;
  /** Epoch ms when the current IN_PROGRESS session began. */
  startedAt?: number;
  /** Epoch ms. */
  completedAt?: number;
};

export type Associate = {
  id: string;
  name: string;
  /** Task types this associate is trained for. */
  skills: TaskType[];
  /** Where the associate is right now, matched against `Task.location`. */
  location?: string;
};
