import { createInMemoryTaskRepository } from '@/data/in-memory-task-repository';
import { createMockTasks } from '@/data/mock-tasks';
import { createSupabaseTaskRepository } from '@/data/supabase-task-repository';
import type { Task } from '@/domain/types';

/** A change pushed from elsewhere (another device, a server job). */
export type TaskChange =
  | { kind: 'upsert'; tasks: Task[] }
  | { kind: 'delete'; id: string }
  | { kind: 'replace'; tasks: Task[] };

/**
 * Persistence and task commands. Each command is atomic and returns the tasks it changed.
 * Implementations enforce the same invariants: legal transitions, one IN_PROGRESS per
 * associate, first acknowledgement of a P0 wins.
 */
export interface TaskRepository {
  loadTasks(): Promise<Task[]>;
  /** Returns an unsubscribe function. */
  subscribe(onChange: (change: TaskChange) => void): () => void;
  /** Start or resume a task, pausing whatever the associate has in progress. */
  start(taskId: string, associateId: string): Promise<Task[]>;
  /** Pause a task and optionally start `nextTaskId` in the same step. */
  pause(taskId: string, associateId: string, nextTaskId?: string): Promise<Task[]>;
  complete(taskId: string): Promise<Task[]>;
  /** "I'm on it" for a P0: fails if someone else acknowledged first. */
  acknowledge(taskId: string, associateId: string): Promise<Task[]>;
  escalateOverdue(): Promise<Task[]>;
  addTask(task: Task): Promise<Task[]>;
  /** Restore the demo seed. Returns the full task list. */
  reset(): Promise<Task[]>;
}

export type DataSource = 'supabase' | 'mock';

export const dataSource: DataSource =
  process.env.EXPO_PUBLIC_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock';

export const taskRepository: TaskRepository =
  dataSource === 'supabase'
    ? createSupabaseTaskRepository()
    : createInMemoryTaskRepository(() => createMockTasks(Date.now()));
