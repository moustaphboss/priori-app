import { Alert } from 'react-native';
import { create } from 'zustand';

import { mockAssociate } from '@/data/mock-tasks';
import { type TaskChange, taskRepository } from '@/data/task-repository';
import { rankTasks } from '@/domain/priority';
import { shouldEscalate } from '@/domain/safety';
import type { Associate, Task } from '@/domain/types';

type TaskStore = {
  associate: Associate;
  tasks: Task[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Start a task. Any task already in progress is paused onto the stack first. */
  start: (taskId: string) => Promise<void>;
  /** Pause the current task onto the stack and promote the top-ranked task. */
  pause: (taskId: string) => Promise<void>;
  /** Resume a paused task, pausing whatever is in progress. */
  resume: (taskId: string) => Promise<void>;
  complete: (taskId: string) => Promise<void>;
  /** Add a new task, e.g. an ad hoc event. Resolves to whether it was saved. */
  addTask: (task: Task) => Promise<boolean>;
  /** Associate takes a P0 ("I'm on it"): records the ack and starts it. */
  acknowledge: (taskId: string) => Promise<void>;
  /** Escalate every P0 whose ack window has run out. Called by the safety watchdog. */
  escalateOverdue: (now: number) => Promise<void>;
  /** Restore the seed data (demo helper). */
  reset: () => Promise<void>;
};

function applyChange(tasks: Task[], change: TaskChange): Task[] {
  switch (change.kind) {
    case 'replace':
      return change.tasks;
    case 'delete':
      return tasks.filter((t) => t.id !== change.id);
    case 'upsert': {
      const byId = new Map(tasks.map((t) => [t.id, t]));
      change.tasks.forEach((t) => byId.set(t.id, t));
      return [...byId.values()];
    }
  }
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

let unsubscribe: (() => void) | undefined;
let escalating = false;

export const useTaskStore = create<TaskStore>()((set, get) => {
  const apply = (change: TaskChange) => set({ tasks: applyChange(get().tasks, change) });

  /** Run a repository command and apply the tasks it changed. Failures are shown, not thrown. */
  const run = async (command: () => Promise<Task[]>): Promise<boolean> => {
    try {
      apply({ kind: 'upsert', tasks: await command() });
      return true;
    } catch (error) {
      console.warn('[task-store]', errorMessage(error));
      Alert.alert('Could not update task', errorMessage(error));
      return false;
    }
  };

  return {
    associate: mockAssociate,
    tasks: [],
    loaded: false,

    load: async () => {
      unsubscribe?.();
      unsubscribe = taskRepository.subscribe(apply);
      try {
        set({ tasks: await taskRepository.loadTasks(), loaded: true });
      } catch (error) {
        console.warn('[task-store] load failed', errorMessage(error));
      }
    },

    start: async (taskId) => {
      await run(() => taskRepository.start(taskId, get().associate.id));
    },

    resume: async (taskId) => {
      await run(() => taskRepository.start(taskId, get().associate.id));
    },

    pause: async (taskId) => {
      const { tasks, associate } = get();
      const [next] = rankTasks(tasks, associate, Date.now());
      await run(() => taskRepository.pause(taskId, associate.id, next?.task.id));
    },

    complete: async (taskId) => {
      await run(() => taskRepository.complete(taskId));
    },

    addTask: (task) => run(() => taskRepository.addTask(task)),

    acknowledge: async (taskId) => {
      await run(() => taskRepository.acknowledge(taskId, get().associate.id));
    },

    escalateOverdue: async (now) => {
      // Only call out when something is actually due, and never twice at once.
      if (escalating || !get().tasks.some((t) => shouldEscalate(t, now))) return;
      escalating = true;
      try {
        await run(() => taskRepository.escalateOverdue());
      } finally {
        escalating = false;
      }
    },

    reset: async () => {
      try {
        apply({ kind: 'replace', tasks: await taskRepository.reset() });
      } catch (error) {
        Alert.alert('Reset failed', errorMessage(error));
      }
    },
  };
});

/** The associate's single IN_PROGRESS task, if any. */
export function selectCurrentTask(state: Pick<TaskStore, 'tasks' | 'associate'>): Task | undefined {
  return state.tasks.find(
    (t) => t.state === 'IN_PROGRESS' && t.assigneeId === state.associate.id,
  );
}

/** The associate's pause stack, most recently paused first. Use with `useShallow`. */
export function selectPausedTasks(state: Pick<TaskStore, 'tasks' | 'associate'>): Task[] {
  return state.tasks
    .filter((t) => t.state === 'PAUSED' && t.assigneeId === state.associate.id)
    .sort((a, b) => (b.pausedAt ?? 0) - (a.pausedAt ?? 0));
}
