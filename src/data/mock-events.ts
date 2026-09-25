import { MINUTE } from '@/domain/time';
import type { PriorityClass, Task, TaskType } from '@/domain/types';

export type SimulatedEvent = {
  id: string;
  label: string;
  description: string;
  type: TaskType;
  priority: PriorityClass;
  /** Builds the task this event injects. */
  create: (now: number) => Omit<Task, 'id' | 'createdAt' | 'workedMs' | 'state' | 'origin'>;
};

export const SIMULATED_EVENTS: SimulatedEvent[] = [
  {
    id: 'spill',
    label: 'Manager: milk spill',
    description: '"Milk spill in Aisle 3 - clean immediately!"',
    type: 'spill',
    priority: 'P0',
    create: () => ({
      title: 'Milk spill in Aisle 3 - clean immediately',
      type: 'spill',
      priority: 'P0',
      location: 'Aisle 3',
      estimatedMinutes: 5,
      customerImpact: 1,
    }),
  },
  {
    id: 'bopis',
    label: 'BOPIS order arrives',
    description: 'Online order, customer pickup in 15 min',
    type: 'bopis',
    priority: 'P1',
    create: (now) => ({
      title: `Pick BOPIS order #${4800 + Math.floor(Math.random() * 200)}`,
      type: 'bopis',
      priority: 'P1',
      location: 'Pickup desk',
      dueAt: now + 15 * MINUTE,
      estimatedMinutes: 8,
      customerImpact: 0.8,
    }),
  },
  {
    id: 'customer',
    label: 'Customer question',
    description: 'Customer waiting at the bakery counter',
    type: 'customer',
    priority: 'P1',
    create: (now) => ({
      title: 'Help customer at bakery counter',
      type: 'customer',
      priority: 'P1',
      location: 'Bakery',
      dueAt: now + 2 * MINUTE,
      estimatedMinutes: 3,
      customerImpact: 1,
    }),
  },
  {
    id: 'low-stock',
    label: 'Low stock alert',
    description: 'Shelf scanner: bananas running out',
    type: 'restock',
    priority: 'P2',
    create: (now) => ({
      title: 'Restock bananas',
      type: 'restock',
      priority: 'P2',
      location: 'Produce',
      dueAt: now + 30 * MINUTE,
      estimatedMinutes: 10,
      customerImpact: 0.5,
    }),
  },
  {
    id: 'label-check',
    label: 'Planned label audit',
    description: 'Weekly price label audit, due end of shift',
    type: 'check',
    priority: 'P3',
    create: (now) => ({
      title: 'Audit price labels in snacks',
      type: 'check',
      priority: 'P3',
      location: 'Aisle 9',
      dueAt: now + 240 * MINUTE,
      estimatedMinutes: 20,
      customerImpact: 0.1,
    }),
  },
];

let counter = 0;

export function createEventTask(event: SimulatedEvent, now = Date.now()): Task {
  counter += 1;
  return {
    ...event.create(now),
    id: `evt-${event.id}-${now}-${counter}`,
    origin: 'adhoc',
    state: 'READY',
    createdAt: now,
    workedMs: 0,
  };
}
