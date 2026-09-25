import { useState } from 'react';

import { suggestFromText } from '@/domain/intake';
import type { PriorityClass, TaskType } from '@/domain/types';

/** Form state for describing a new task, with a suggestion the user can override. */
export function useTaskDraft(initialLocation = '') {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(initialLocation);
  // Undefined until the user overrides the suggestion.
  const [typeChoice, setType] = useState<TaskType>();
  const [priorityChoice, setPriority] = useState<PriorityClass>();

  const suggestion = suggestFromText(description);
  const type = typeChoice ?? suggestion?.type ?? 'check';
  const priority = priorityChoice ?? suggestion?.priority ?? 'P3';

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
    usingSuggestion:
      suggestion !== undefined && type === suggestion.type && priority === suggestion.priority,
    isValid: description.trim().length >= 3,
  };
}

export type TaskDraftState = ReturnType<typeof useTaskDraft>;
