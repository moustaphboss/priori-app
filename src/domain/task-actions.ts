import type { TaskAction, TaskState } from './types';

/** Actions an associate can take on a task in a given state, primary action first. */
export function availableActions(state: TaskState): TaskAction[] {
  switch (state) {
    case 'READY':
    case 'ASSIGNED':
      return ['start'];
    case 'IN_PROGRESS':
      return ['complete', 'pause'];
    case 'PAUSED':
      return ['resume'];
    default:
      return [];
  }
}
