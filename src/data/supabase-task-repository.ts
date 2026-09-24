import type { TaskChange, TaskRepository } from '@/data/task-repository';
import type { PriorityClass, Task, TaskOrigin, TaskState, TaskType } from '@/domain/types';
import { getSupabase } from '@/lib/supabase';

/** Row shape of `public.tasks` (see supabase/migrations). */
type TaskRow = {
  id: string;
  title: string;
  type: TaskType;
  origin: TaskOrigin;
  priority: PriorityClass;
  state: TaskState;
  location: string | null;
  due_at: string | null;
  estimated_minutes: number;
  customer_impact: number;
  assignee_id: string | null;
  created_at: string;
  worked_ms: number;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  acknowledged_at: string | null;
  version: number;
};

const toMs = (value: string | null) => (value === null ? undefined : Date.parse(value));
const toIso = (ms: number | undefined) => (ms === undefined ? null : new Date(ms).toISOString());

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    origin: row.origin,
    priority: row.priority,
    state: row.state,
    location: row.location ?? undefined,
    dueAt: toMs(row.due_at),
    estimatedMinutes: row.estimated_minutes,
    customerImpact: row.customer_impact,
    assigneeId: row.assignee_id ?? undefined,
    createdAt: Date.parse(row.created_at),
    workedMs: Number(row.worked_ms),
    startedAt: toMs(row.started_at),
    pausedAt: toMs(row.paused_at),
    completedAt: toMs(row.completed_at),
    acknowledgedAt: toMs(row.acknowledged_at),
  };
}

let channelCount = 0;

export function createSupabaseTaskRepository(): TaskRepository {
  // Latest version seen per task, so late realtime events can't overwrite newer data.
  const versions = new Map<string, number>();

  const accept = (row: TaskRow) => {
    if ((versions.get(row.id) ?? -1) > row.version) return false;
    versions.set(row.id, row.version);
    return true;
  };

  const fromRows = (rows: TaskRow[] | null) => (rows ?? []).filter(accept).map(toTask);

  const rpc = async (fn: string, args?: Record<string, unknown>) => {
    const { data, error } = await getSupabase().rpc(fn, args);
    if (error) throw new Error(error.message);
    return fromRows(data as TaskRow[] | null);
  };

  const loadTasks = async () => {
    const { data, error } = await getSupabase().from('tasks').select('*');
    if (error) throw new Error(error.message);
    versions.clear();
    return fromRows(data as TaskRow[]);
  };

  return {
    loadTasks,

    subscribe: (onChange: (change: TaskChange) => void) => {
      const supabase = getSupabase();
      // Unique topic per subscription: supabase-js reuses channels by name, and a reused
      // channel that's already subscribed rejects new listeners (e.g. after a Fast Refresh).
      channelCount += 1;
      const channel = supabase
        .channel(`tasks-${channelCount}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as Partial<TaskRow>).id;
            if (id) {
              versions.delete(id);
              onChange({ kind: 'delete', id });
            }
            return;
          }
          const row = payload.new as TaskRow;
          if (accept(row)) onChange({ kind: 'upsert', tasks: [toTask(row)] });
        })
        .subscribe((status) => {
          // Catch up on anything missed while disconnected (e.g. app in background).
          if (status === 'SUBSCRIBED') {
            loadTasks()
              .then((tasks) => onChange({ kind: 'replace', tasks }))
              .catch((error) => console.warn('[supabase] resync failed', error));
          }
        });
      return () => void supabase.removeChannel(channel);
    },

    start: (taskId, associateId) =>
      rpc('start_task', { p_task: taskId, p_associate: associateId }),

    pause: (taskId, associateId, nextTaskId) =>
      rpc('pause_task', { p_task: taskId, p_associate: associateId, p_next: nextTaskId ?? null }),

    complete: (taskId) => rpc('complete_task', { p_task: taskId }),

    acknowledge: (taskId, associateId) =>
      rpc('acknowledge_p0', { p_task: taskId, p_associate: associateId }),

    escalateOverdue: () => rpc('escalate_overdue_p0'),

    addTask: async (task) => {
      // created_at, worked_ms and version come from the database.
      const { data, error } = await getSupabase()
        .from('tasks')
        .insert({
          id: task.id,
          title: task.title,
          type: task.type,
          origin: task.origin,
          priority: task.priority,
          state: task.state,
          location: task.location ?? null,
          due_at: toIso(task.dueAt),
          estimated_minutes: task.estimatedMinutes,
          customer_impact: task.customerImpact,
          assignee_id: task.assigneeId ?? null,
        })
        .select();
      if (error) throw new Error(error.message);
      return fromRows(data as TaskRow[]);
    },

    reset: async () => {
      versions.clear();
      return rpc('reset_demo');
    },
  };
}
