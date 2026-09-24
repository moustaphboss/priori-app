import { createMockTasks } from '@/data/mock-tasks';
import type { Task } from '@/domain/types';

/** Persistence boundary. Swap the in-memory implementation for API calls later. */
export interface TaskRepository {
  loadTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<void>;
}

export function createInMemoryTaskRepository(seed: Task[]): TaskRepository {
  const tasks = new Map(seed.map((t) => [t.id, t]));
  return {
    async loadTasks() {
      return [...tasks.values()];
    },
    async saveTask(task) {
      tasks.set(task.id, task);
    },
  };
}

export const taskRepository: TaskRepository = createInMemoryTaskRepository(
  createMockTasks(Date.now()),
);
