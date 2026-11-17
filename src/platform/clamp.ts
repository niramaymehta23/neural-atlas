/**
 * Small guards for `parseState`: a snapshot link can be hand-made, so every number a lesson
 * draws is clamped to its dial's range and every list is capped before the scene sees it.
 */
export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** A whole number in range (rounded first). */
export const clampWhole = (value: number, min: number, max: number) =>
  clampNumber(Math.round(value), min, max);

/** `value` when it is one of `options`, else `fallback`. */
export const oneOf = <T>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/** At most `max` items, each kept only when `keep` accepts it. */
export const capList = <T>(
  list: readonly unknown[],
  max: number,
  keep: (item: unknown) => item is T,
) => list.filter(keep).slice(0, max);
