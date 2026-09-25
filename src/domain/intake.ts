import { MINUTE } from './time';
import type { PriorityClass, Task, TaskType } from './types';

export type Suggestion = {
  type: TaskType;
  priority: PriorityClass;
  /** Shown to the associate, e.g. 'Matched "spill"'. */
  reason: string;
  /** 'rules' today. An AI suggester can plug in later with 'ai' and the same shape. */
  source: 'rules' | 'ai';
};

type Rule = { pattern: RegExp; type: TaskType; priority: PriorityClass };

/** Checked in order: safety first, so "customer slipped on a spill" is always P0. */
const RULES: Rule[] = [
  { pattern: /\b(spill\w*|leak\w*|wet floor|broken glass|smash\w*)\b/i, type: 'spill', priority: 'P0' },
  { pattern: /\b(injur\w*|fell|fall(en)?|slipped|bleed\w*|blood|faint\w*|unconscious)\b/i, type: 'customer', priority: 'P0' },
  { pattern: /\b(fire|smoke|gas)\b/i, type: 'check', priority: 'P0' },
  { pattern: /\b(bopis|pick ?up|online order|click (and|&) collect)\b/i, type: 'bopis', priority: 'P1' },
  { pattern: /\b(customer|asking|looking for|complain\w*|help)\b/i, type: 'customer', priority: 'P1' },
  { pattern: /\b(expired|out of date|temperature|fridge|freezer)\b/i, type: 'check', priority: 'P2' },
  { pattern: /\b(restock|out of stock|empty|running out|low stock|refill)\b/i, type: 'restock', priority: 'P2' },
  { pattern: /\b(price|label|tag|signage)\b/i, type: 'check', priority: 'P3' },
];

/** Deterministic keyword suggestion. Returns undefined when there's nothing to go on yet. */
export function suggestFromText(text: string): Suggestion | undefined {
  const trimmed = text.trim();
  if (trimmed.length < 3) return undefined;

  for (const rule of RULES) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      return {
        type: rule.type,
        priority: rule.priority,
        reason: `Matched “${match[0].toLowerCase()}”`,
        source: 'rules',
      };
    }
  }
  return { type: 'check', priority: 'P3', reason: 'No keywords matched', source: 'rules' };
}

export type AdhocDraft = {
  description: string;
  type: TaskType;
  priority: PriorityClass;
  location?: string;
  /** Set when a manager dispatches the task to someone directly. */
  assigneeId?: string;
};

/** Default time-to-due by class. P0 has no deadline: it has the 30 s ack rule instead. */
const DUE_IN: Record<PriorityClass, number | undefined> = {
  P0: undefined,
  P1: 10 * MINUTE,
  P2: 30 * MINUTE,
  P3: 120 * MINUTE,
};

const CUSTOMER_IMPACT: Record<TaskType, number> = {
  spill: 1,
  customer: 1,
  bopis: 0.8,
  restock: 0.4,
  check: 0.1,
};

const ESTIMATED_MINUTES: Record<TaskType, number> = {
  spill: 5,
  customer: 3,
  bopis: 8,
  restock: 10,
  check: 5,
};

/** First line of the description as a short, capitalized title. */
export function titleFromDescription(description: string): string {
  const firstLine = description.trim().split('\n')[0].trim();
  const title = firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function createAdhocTask(draft: AdhocDraft, now = Date.now()): Task {
  const dueIn = DUE_IN[draft.priority];
  return {
    id: `adhoc-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: titleFromDescription(draft.description),
    type: draft.type,
    origin: 'adhoc',
    priority: draft.priority,
    state: draft.assigneeId ? 'ASSIGNED' : 'READY',
    assigneeId: draft.assigneeId,
    assignedAt: draft.assigneeId ? now : undefined,
    location: draft.location?.trim() || undefined,
    dueAt: dueIn === undefined ? undefined : now + dueIn,
    estimatedMinutes: ESTIMATED_MINUTES[draft.type],
    customerImpact: CUSTOMER_IMPACT[draft.type],
    createdAt: now,
    workedMs: 0,
  };
}
