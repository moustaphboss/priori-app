// Pure decision logic: which task changes deserve a push, to whom, and what it says.
// No Deno or network APIs here, so it can be tested from Node.

export type TaskRow = {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  state: string;
  location: string | null;
  assignee_id: string | null;
  assigned_at: string | null;
  acknowledged_at: string | null;
};

export type TaskChangePayload = {
  type: 'INSERT' | 'UPDATE';
  record: TaskRow;
  old_record: TaskRow | null;
};

/** Personas are associate ids, or 'manager'. */
export type Audience = { kind: 'personas'; personas: string[] } | { kind: 'all-associates' };

export type Notice = {
  audience: Audience;
  title: string;
  body: string;
  taskId: string;
  priority: TaskRow['priority'];
  /** Safety-critical: max-importance channel, time-sensitive on iOS. */
  urgent: boolean;
  /** Notification category with action buttons (see P0_CATEGORY in the app). */
  category?: 'p0-alert';
};

const MANAGER = 'manager';

export function decideNotification({ type, record: task, old_record: old }: TaskChangePayload): Notice | undefined {
  const where = task.location ? `${task.location}. ` : '';
  const base = { taskId: task.id, priority: task.priority };

  // 1. Escalation: nobody acknowledged a P0 in time. Tell the manager.
  if (task.state === 'ESCALATED' && old?.state !== 'ESCALATED') {
    return {
      ...base,
      audience: { kind: 'personas', personas: [MANAGER] },
      title: `Escalated: ${task.title}`,
      body: `${where}Nobody acknowledged within 30 s. Open the app to reassign.`,
      urgent: true,
    };
  }

  // A manager decision put this task on someone: created assigned, or (re)assigned later.
  const assignedByManager =
    task.assignee_id !== null &&
    (type === 'INSERT' || task.assigned_at !== (old?.assigned_at ?? null));

  // 2. P0 waiting for acknowledgement: its assignee, or everyone on the floor if open.
  const awaitingAck =
    task.priority === 'P0' && task.acknowledged_at === null && ['READY', 'ASSIGNED'].includes(task.state);
  if (awaitingAck && (type === 'INSERT' || assignedByManager)) {
    return {
      ...base,
      audience: task.assignee_id
        ? { kind: 'personas', personas: [task.assignee_id] }
        : { kind: 'all-associates' },
      title: `P0 · ${task.title}`,
      body: `${where}Acknowledge within 30 s.`,
      urgent: true,
      // Adds the "I'm on it" button.
      category: 'p0-alert',
    };
  }

  // 3. Any other task the manager sent to someone.
  if (assignedByManager && task.state === 'ASSIGNED') {
    return {
      ...base,
      audience: { kind: 'personas', personas: [task.assignee_id as string] },
      title: `New ${task.priority} task`,
      body: task.location ? `${task.title} · ${task.location}` : task.title,
      urgent: false,
    };
  }

  return undefined;
}
