// Output contract for the AI suggester, plus the check we run on every model response.
// Pure module (no Deno / network), so it can be tested from Node.

export const TASK_TYPES = ['restock', 'check', 'spill', 'bopis', 'customer'] as const;
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;

export type AiSuggestion = {
  title: string;
  type: (typeof TASK_TYPES)[number];
  priority: (typeof PRIORITIES)[number];
  /** Empty when the message doesn't say where. */
  location: string;
  /** One short sentence shown to the person confirming the task. */
  reason: string;
  /** False when the message is too vague to classify with confidence. */
  understood: boolean;
};

/** JSON schema sent to the model as the required output format. */
export const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short imperative task title, max 60 characters.' },
    type: { type: 'string', enum: [...TASK_TYPES] },
    priority: { type: 'string', enum: [...PRIORITIES] },
    location: { type: 'string', description: 'Where in the store, or empty string if not stated.' },
    reason: { type: 'string', description: 'One short sentence explaining the priority.' },
    understood: { type: 'boolean' },
  },
  required: ['title', 'type', 'priority', 'location', 'reason', 'understood'],
  additionalProperties: false,
} as const;

/**
 * Structured outputs make the shape very likely, but the model's answer is still untrusted
 * input: check every field before it reaches the app. Returns the suggestion or a reason.
 */
export function validateSuggestion(raw: unknown): { ok: true; value: AiSuggestion } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'not an object' };
  const r = raw as Record<string, unknown>;

  const str = (key: string, max: number, allowEmpty = false) => {
    const v = r[key];
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    if ((!allowEmpty && t.length === 0) || t.length > max) return undefined;
    return t;
  };

  const title = str('title', 80);
  if (title === undefined) return { ok: false, error: 'bad title' };
  if (!TASK_TYPES.includes(r.type as AiSuggestion['type'])) return { ok: false, error: `bad type: ${String(r.type)}` };
  if (!PRIORITIES.includes(r.priority as AiSuggestion['priority'])) {
    return { ok: false, error: `bad priority: ${String(r.priority)}` };
  }
  const location = str('location', 60, true);
  if (location === undefined) return { ok: false, error: 'bad location' };
  const reason = str('reason', 200);
  if (reason === undefined) return { ok: false, error: 'bad reason' };
  if (typeof r.understood !== 'boolean') return { ok: false, error: 'bad understood' };

  return {
    ok: true,
    value: {
      title,
      type: r.type as AiSuggestion['type'],
      priority: r.priority as AiSuggestion['priority'],
      location,
      reason,
      understood: r.understood,
    },
  };
}
