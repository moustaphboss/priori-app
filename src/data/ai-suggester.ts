import { dataSource } from '@/data/task-repository';
import type { Suggestion } from '@/domain/intake';

/** Wait for the user to pause typing before asking the model. */
export const AI_DEBOUNCE_MS = 700;
/** Slightly longer than the function's own model timeout; after this the rules result stands. */
const AI_TIMEOUT_MS = 9000;
/** Don't spend a model call on a couple of words. */
const MIN_CHARS = 8;

type AiResponse = {
  suggestion: {
    title: string;
    type: Suggestion['type'];
    priority: Suggestion['priority'];
    location: string;
    reason: string;
    understood: boolean;
  };
  model: string;
  latencyMs: number;
};

export function aiSuggestionsAvailable(text: string): boolean {
  return dataSource === 'supabase' && text.trim().length >= MIN_CHARS;
}

/**
 * Ask the suggest-task Edge Function for an AI suggestion. Throws on any failure or timeout;
 * callers keep the rule-based suggestion in that case.
 */
export async function fetchAiSuggestion(text: string, signal: AbortSignal): Promise<Suggestion> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');

  // Abort on the caller's signal (text changed) or our timeout, whichever comes first.
  // Done by hand: AbortSignal.any/timeout aren't available in every React Native runtime.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);

  let body: AiResponse;
  try {
    const response = await fetch(`${url}/functions/v1/suggest-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ text: text.trim() }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`suggest-task ${response.status}`);
    body = (await response.json()) as AiResponse;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }

  const { suggestion } = body;
  return {
    type: suggestion.type,
    priority: suggestion.priority,
    reason: suggestion.reason,
    source: 'ai',
    confident: suggestion.understood,
    title: suggestion.title,
    location: suggestion.location || undefined,
  };
}
