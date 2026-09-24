import { create } from 'zustand';

import { createMockTasks, mockAssociate } from '@/data/mock-tasks';
import { taskRepository } from '@/data/task-repository';
import { rankTasks } from '@/domain/priority';
import { shouldEscalate } from '@/domain/safety';
import { transition } from '@/domain/state-machine';
import type { Associate, Task } from '@/domain/types';

type TaskStore = {
  associate: Associate;
  tasks: Task[];
  /** Paused task ids per associate, most recent last. */
  pauseStacks: Record<string, string[]>;
  loaded: boolean;
  load: () => Promise<void>;
  /** Start a task. Any task already in progress is paused onto the stack first. */
  start: (taskId: string) => void;
  /** Pause the current task onto the stack and promote the top-ranked task. */
  pause: (taskId: string) => void;
  /** Resume a paused task, pausing whatever is in progress. */
  resume: (taskId: string) => void;
  complete: (taskId: string) => void;
  /** Add a new task, e.g. an ad hoc event. */
  addTask: (task: Task) => void;
  /** Associate takes a P0 ("I'm on it"): records the ack and starts it. */
  acknowledge: (taskId: string) => void;
  /** Escalate every P0 whose ack window has run out. Called by the safety watchdog. */
  escalateOverdue: (now: number) => void;
  /** Restore the seed data (demo helper). */
  reset: () => void;
};

const EMPTY_STACK: string[] = [];

export const useTaskStore = create<TaskStore>()((set, get) => {
  /** Apply a pure update to one task, then persist it. */
  const update = (taskId: string, fn: (task: Task) => Task) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = fn(task);
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? next : t)) });
    void taskRepository.saveTask(next);
  };

  const setStack = (fn: (stack: string[]) => string[]) => {
    const { associate, pauseStacks } = get();
    const stack = pauseStacks[associate.id] ?? EMPTY_STACK;
    set({ pauseStacks: { ...pauseStacks, [associate.id]: fn(stack) } });
  };

  /** Pause the in-progress task (if any) and push it onto the stack. */
  const pauseCurrent = (now: number) => {
    const current = selectCurrentTask(get());
    if (!current) return;
    update(current.id, (t) => transition(t, 'PAUSED', now));
    setStack((stack) => [...stack, current.id]);
  };

  /** Make a task the one IN_PROGRESS task, enforcing the one-at-a-time rule. */
  const activate = (taskId: string, now: number) => {
    const { associate } = get();
    pauseCurrent(now);
    setStack((stack) => stack.filter((id) => id !== taskId));
    update(taskId, (task) => {
      // Starting a P0 counts as acknowledging it.
      if (task.priority === 'P0' && task.acknowledgedAt === undefined) {
        task = { ...task, acknowledgedAt: now };
      }
      const assigned =
        task.state === 'READY' || task.state === 'ESCALATED'
          ? transition({ ...task, assigneeId: associate.id }, 'ASSIGNED', now)
          : task;
      return transition(assigned, 'IN_PROGRESS', now);
    });
  };

  return {
    associate: mockAssociate,
    tasks: [],
    pauseStacks: {},
    loaded: false,

    load: async () => {
      set({ tasks: await taskRepository.loadTasks(), loaded: true });
    },

    start: (taskId) => activate(taskId, Date.now()),

    resume: (taskId) => activate(taskId, Date.now()),

    pause: (taskId) => {
      if (selectCurrentTask(get())?.id !== taskId) return;
      const now = Date.now();
      pauseCurrent(now);
      const [next] = rankTasks(get().tasks, get().associate, now);
      if (next) activate(next.task.id, now);
    },

    complete: (taskId) => {
      update(taskId, (task) => transition(task, 'COMPLETED', Date.now()));
    },

    addTask: (task) => {
      set({ tasks: [...get().tasks, task] });
      void taskRepository.saveTask(task);
    },

    acknowledge: (taskId) => {
      const now = Date.now();
      update(taskId, (task) => ({ ...task, acknowledgedAt: now }));
      activate(taskId, now);
    },

    escalateOverdue: (now) => {
      for (const task of get().tasks) {
        if (shouldEscalate(task, now)) update(task.id, (t) => transition(t, 'ESCALATED', now));
      }
    },

    reset: () => {
      const tasks = createMockTasks(Date.now());
      set({ tasks, pauseStacks: {} });
      void taskRepository.replaceAll(tasks);
    },
  };
});

/** The associate's single IN_PROGRESS task, if any. */
export function selectCurrentTask(state: Pick<TaskStore, 'tasks' | 'associate'>): Task | undefined {
  return state.tasks.find(
    (t) => t.state === 'IN_PROGRESS' && t.assigneeId === state.associate.id,
  );
}

/** Paused task ids for the associate, most recent last. Stable reference when unchanged. */
export function selectPauseStackIds(state: Pick<TaskStore, 'pauseStacks' | 'associate'>): string[] {
  return state.pauseStacks[state.associate.id] ?? EMPTY_STACK;
}
