import { useEffect, useState } from 'react';

import { AI_DEBOUNCE_MS, aiSuggestionsAvailable, fetchAiSuggestion } from '@/data/ai-suggester';
import { combineSuggestions, type Suggestion, suggestFromText } from '@/domain/intake';
import type { PriorityClass, TaskType } from '@/domain/types';

export type AiStatus = 'off' | 'thinking' | 'done' | 'failed';

/**
 * AI suggestion for `text`, fetched after the user pauses typing. The result is tied to the text
 * it was computed for, so a stale answer is never shown against newer text.
 */
function useAiSuggestion(text: string): { suggestion?: Suggestion; status: AiStatus } {
  const [result, setResult] = useState<{ text: string; suggestion?: Suggestion }>();
  const enabled = aiSuggestionsAvailable(text);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchAiSuggestion(text, controller.signal).then(
        (suggestion) => setResult({ text, suggestion }),
        () => {
          // Aborted because the text changed: a newer request is on its way.
          if (!controller.signal.aborted) setResult({ text });
        },
      );
    }, AI_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, enabled]);

  if (!enabled) return { status: 'off' };
  if (result?.text !== text) return { status: 'thinking' };
  return result.suggestion ? { suggestion: result.suggestion, status: 'done' } : { status: 'failed' };
}

/** Form state for describing a new task, with a suggestion the user can override. */
export function useTaskDraft(initialLocation = '', initialDescription = '') {
  const [description, setDescription] = useState(initialDescription);
  // Undefined until the user types a location; until then the AI's location (if any) is used.
  const [locationInput, setLocation] = useState<string>();
  // Undefined until the user overrides the suggestion.
  const [typeChoice, setType] = useState<TaskType>();
  const [priorityChoice, setPriority] = useState<PriorityClass>();

  const rules = suggestFromText(description);
  const ai = useAiSuggestion(description);
  const suggestion = combineSuggestions(rules, ai.suggestion);

  const type = typeChoice ?? suggestion?.type ?? 'check';
  const priority = priorityChoice ?? suggestion?.priority ?? 'P3';
  const location = locationInput ?? suggestion?.location ?? initialLocation;

  return {
    description,
    setDescription,
    location,
    setLocation,
    type,
    setType,
    priority,
    setPriority,
    suggestion,
    aiStatus: ai.status,
    /** Cleaner title from the AI, if it answered; otherwise the description is used. */
    title: suggestion?.title,
    usingSuggestion:
      suggestion !== undefined && type === suggestion.type && priority === suggestion.priority,
    isValid: description.trim().length >= 3,
    /** We know what kind of task this is: something was recognised, or the user picked type or priority. */
    isUnderstood:
      typeChoice !== undefined || priorityChoice !== undefined || suggestion?.confident === true,
  };
}

export type TaskDraftState = ReturnType<typeof useTaskDraft>;
