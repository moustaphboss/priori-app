import { MINUTE } from './time';

/** Human-readable deadline relative to `now`, e.g. "Due in 8 min" or "Overdue 3 min". */
export function formatDue(dueAt: number | undefined, now: number): string | undefined {
  if (dueAt === undefined) return undefined;

  const minutes = Math.round((dueAt - now) / MINUTE);
  if (minutes < 0) return `Overdue ${-minutes} min`;
  if (minutes === 0) return 'Due now';
  if (minutes < 60) return `Due in ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `Due in ${hours}h` : `Due in ${hours}h ${rest}m`;
}

export function isOverdue(dueAt: number | undefined, now: number): boolean {
  return dueAt !== undefined && dueAt < now;
}

/** Stopwatch format: "4:07" or "1:02:07". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
