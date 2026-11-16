/**
 * Every value-to-visual mapping lives here, so "thicker means stronger" and "warmer means a bigger
 * mistake" read the same in every world. Inputs are normalised to 0–1 by the caller.
 */

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

const THICKNESS_PX = { min: 1, max: 8 };
const TRAVEL_SECONDS = { slowest: 2.4, fastest: 0.4 };

/** Line width in px for a connection: 0 is a hairline, 1 is a firm stroke. */
export function thickness(strength: number): number {
  return THICKNESS_PX.min + clamp01(strength) * (THICKNESS_PX.max - THICKNESS_PX.min);
}

/** Colour for a mistake: 0 is the calm sky of information, 1 is warm rose. */
export function warmth(mistake: number): string {
  const rose = Math.round(clamp01(mistake) * 100);
  return `color-mix(in oklab, var(--color-bad) ${rose}%, var(--color-flow))`;
}

/** Seconds for something to travel along a path: more activity moves faster. */
export function speed(activity: number): number {
  return (
    TRAVEL_SECONDS.slowest - clamp01(activity) * (TRAVEL_SECONDS.slowest - TRAVEL_SECONDS.fastest)
  );
}
