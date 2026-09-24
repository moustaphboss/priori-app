import { useEffect } from 'react';

import { useTaskStore } from '@/store/task-store';

/** Escalates P0 tasks that weren't acknowledged in time. Rule-based, runs independently of any UI. */
export function useSafetyWatchdog(intervalMs = 1000) {
  useEffect(() => {
    const id = setInterval(() => useTaskStore.getState().escalateOverdue(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
