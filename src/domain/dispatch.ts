import { aisleDistance, proximityScore } from './location';
import type { Associate, PriorityClass, Task, TaskType } from './types';

/** Weights for choosing who should take a task. Deterministic and explainable, like task ranking. */
export const ASSIGNEE_WEIGHTS = {
  skill: 0.35,
  availability: 0.3,
  proximity: 0.2,
  load: 0.15,
} as const;

const URGENCY: Record<PriorityClass, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

const SKILL_LABELS: Record<TaskType, string> = {
  spill: 'spills',
  customer: 'customer help',
  bopis: 'online orders',
  restock: 'restocking',
  check: 'checks',
};

/** Queue length at which the load factor bottoms out. */
const MAX_QUEUE = 5;

export type AssigneeRecommendation = {
  associate: Associate;
  /** 0–1. */
  score: number;
  reasons: string[];
  /** Where the associate is now: their current task's location, else their home zone. */
  location?: string;
};

export type DispatchTarget = Pick<Task, 'type' | 'priority' | 'location'>;

export function recommendAssignees(
  task: DispatchTarget,
  associates: Associate[],
  tasks: Task[],
): AssigneeRecommendation[] {
  return associates
    .map((associate) => {
      const mine = tasks.filter((t) => t.assigneeId === associate.id);
      const current = mine.find((t) => t.state === 'IN_PROGRESS');
      const queued = mine.filter((t) => t.state === 'ASSIGNED' || t.state === 'PAUSED').length;
      const location = current?.location ?? associate.location;

      const trained = associate.skills.includes(task.type);
      const skill = trained ? 1 : 0.3;

      // Free beats busy; busy on less urgent work can pause; never pull someone off a P0.
      let availability = 1;
      let availabilityReason = 'Free now';
      if (current?.priority === 'P0') {
        availability = 0;
        availabilityReason = 'Busy with a P0';
      } else if (current && URGENCY[current.priority] > URGENCY[task.priority]) {
        availability = 0.6;
        availabilityReason = `On a ${current.priority} task, can pause`;
      } else if (current) {
        availability = 0.2;
        availabilityReason = `Busy with a ${current.priority} task`;
      }

      const proximity = proximityScore(task.location, location);
      const load = 1 - Math.min(queued / MAX_QUEUE, 1);

      const score =
        ASSIGNEE_WEIGHTS.skill * skill +
        ASSIGNEE_WEIGHTS.availability * availability +
        ASSIGNEE_WEIGHTS.proximity * proximity +
        ASSIGNEE_WEIGHTS.load * load;

      const distance = aisleDistance(task.location, location);
      const reasons = [
        trained ? `Trained for ${SKILL_LABELS[task.type]}` : 'Not trained for this',
        availabilityReason,
        distance === 0 ? `At ${location}` : distance !== undefined ? `${distance} aisle${distance === 1 ? '' : 's'} away` : undefined,
        queued > 0 ? `${queued} queued` : undefined,
      ].filter((r): r is string => r !== undefined);

      return { associate, score, reasons, location };
    })
    .sort((a, b) => b.score - a.score);
}
