import type { TaskRepository } from '@/data/task-repository';
import { shouldEscalate } from '@/domain/safety';
import { transition } from '@/domain/state-machine';
import type { Associate, Task } from '@/domain/types';

/** Offline implementation with the same rules as the database. Used for demos without a network. */
export function createInMemoryTaskRepository(
  seed: () => Task[],
  associates: Associate[],
): TaskRepository {
  let tasks = new Map<string, Task>();
  const replaceAll = (list: Task[]) => {
    tasks = new Map(list.map((t) => [t.id, t]));
  };
  replaceAll(seed());

  const get = (id: string) => {
    const task = tasks.get(id);
    if (!task) throw new Error(`Unknown task ${id}`);
    return task;
  };

  const save = (list: Task[]) => {
    list.forEach((t) => tasks.set(t.id, t));
    return list;
  };

  /** Run a command all-or-nothing, like a database transaction. */
  const atomic = async (command: () => Task[]) => {
    const backup = new Map(tasks);
    try {
      return command();
    } catch (error) {
      tasks = backup;
      throw error;
    }
  };

  const pauseCurrent = (associateId: string, now: number) => {
    const current = [...tasks.values()].find(
      (t) => t.state === 'IN_PROGRESS' && t.assigneeId === associateId,
    );
    return current ? save([transition(current, 'PAUSED', now)]) : [];
  };

  const start = (taskId: string, associateId: string, now: number) => {
    const paused = pauseCurrent(associateId, now).filter((t) => t.id !== taskId);
    let task = get(taskId);
    if (task.state === 'READY' || task.state === 'ESCALATED') {
      task = transition({ ...task, assigneeId: associateId }, 'ASSIGNED', now);
    }
    if (task.assigneeId !== associateId) {
      throw new Error(`Task ${taskId} is assigned to someone else`);
    }
    // Starting a P0 counts as acknowledging it.
    if (task.priority === 'P0' && task.acknowledgedAt === undefined) {
      task = { ...task, acknowledgedAt: now };
    }
    return [...paused, ...save([transition(task, 'IN_PROGRESS', now)])];
  };

  return {
    loadTasks: async () => [...tasks.values()],

    loadAssociates: async () => associates,

    // Nothing changes behind this repository's back.
    subscribe: () => () => {},

    start: (taskId, associateId) => atomic(() => start(taskId, associateId, Date.now())),

    pause: (taskId, associateId, nextTaskId) =>
      atomic(() => {
        const now = Date.now();
        const task = get(taskId);
        if (task.state !== 'IN_PROGRESS' || task.assigneeId !== associateId) {
          throw new Error(`Task ${taskId} is not in progress`);
        }
        const paused = pauseCurrent(associateId, now);
        return nextTaskId ? [...paused, ...start(nextTaskId, associateId, now)] : paused;
      }),

    complete: (taskId) => atomic(() => save([transition(get(taskId), 'COMPLETED', Date.now())])),

    assign: (taskId, associateId) =>
      atomic(() => {
        const task = get(taskId);
        if (!['READY', 'ASSIGNED', 'ESCALATED'].includes(task.state)) {
          throw new Error(`Task ${taskId} can't be reassigned while ${task.state}`);
        }
        const now = Date.now();
        const reassigned = { ...task, assigneeId: associateId, assignedAt: now };
        return save([
          task.state === 'ASSIGNED' ? reassigned : transition(reassigned, 'ASSIGNED', now),
        ]);
      }),

    acknowledge: (taskId, associateId) =>
      atomic(() => {
        if (get(taskId).acknowledgedAt !== undefined) {
          throw new Error('Already acknowledged by someone else');
        }
        return start(taskId, associateId, Date.now());
      }),

    escalateOverdue: () =>
      atomic(() => {
        const now = Date.now();
        return save(
          [...tasks.values()]
            .filter((t) => shouldEscalate(t, now))
            .map((t) => transition(t, 'ESCALATED', now)),
        );
      }),

    addTask: (task) => atomic(() => save([task])),

    reset: async () => {
      replaceAll(seed());
      return [...tasks.values()];
    },
  };
}
