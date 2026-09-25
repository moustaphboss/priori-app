const AISLE = /aisle\s*(\d+)/i;

/** Distance in aisles between two store locations, or undefined when we can't tell. */
export function aisleDistance(a: string | undefined, b: string | undefined): number | undefined {
  if (!a || !b) return undefined;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return 0;
  const x = a.match(AISLE);
  const y = b.match(AISLE);
  if (x && y) return Math.abs(Number(x[1]) - Number(y[1]));
  return undefined;
}

/** 0–1, 1 = same spot. Unknown distance scores neutral (0.5). */
export function proximityScore(a: string | undefined, b: string | undefined): number {
  const distance = aisleDistance(a, b);
  if (distance === undefined) return 0.5;
  return Math.max(0, 1 - distance / 10);
}
