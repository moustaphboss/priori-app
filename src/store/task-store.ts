import { create } from 'zustand';

import { mockAssociate } from '@/data/mock-tasks';
import { taskRepository } from '@/data/task-repository';
import { transition } from '@/domain/state-machine';
import type { Associate, Task } from '@/domain/types';

type TaskStore = {
  associate: Associate;
  tasks: Task[];
  loaded: boolean;
  load: () => Promise<void>;
  start: (taskId: string) => void;
  complete: (taskId: string) => void;
};

export const useTaskStore = create<TaskStore>()((set, get) => {
  /** Apply a pure update to one task, then persist it. */
  const update = (taskId: string, fn: (task: Task) => Task) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = fn(task);
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? next : t)) });
    void taskRepository.saveTask(next);
  };

  return {
    associate: mockAssociate,
    tasks: [],
    loaded: false,

    load: async () => {
      set({ tasks: await taskRepository.loadTasks(), loaded: true });
    },

    start: (taskId) => {
      const { associate } = get();
      if (selectCurrentTask(get())) {
        console.warn('[task-store] already have a task in progress; pause it first');
        return;
      }
      const now = Date.now();
      update(taskId, (task) => {
        const assigned =
          task.state === 'READY'
            ? transition({ ...task, assigneeId: associate.id }, 'ASSIGNED', now)
            : task;
        return transition(assigned, 'IN_PROGRESS', now);
      });
    },

    complete: (taskId) => {
      update(taskId, (task) => transition(task, 'COMPLETED', Date.now()));
    },
  };
});

/** The associate's single IN_PROGRESS task, if any. */
export function selectCurrentTask(state: Pick<TaskStore, 'tasks' | 'associate'>): Task | undefined {
  return state.tasks.find(
    (t) => t.state === 'IN_PROGRESS' && t.assigneeId === state.associate.id,
  );
}
