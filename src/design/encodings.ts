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

/** A connection's sign: sage pushes the next neuron up, rose pushes it down. */
export function weightTone(weight: number): string {
  return weight < 0 ? "var(--color-bad)" : "var(--color-good)";
}

const FULLNESS = { min: 0.18, max: 1 };

/** How filled-in a neuron looks: 0 is a faint outline of a dot, 1 is solid. */
export function fullness(activation: number): number {
  return FULLNESS.min + clamp01(activation) * (FULLNESS.max - FULLNESS.min);
}

/**
 * Up to three groups of examples. Clay stays reserved for "touch here" and rose for mistakes,
 * so groups are sky, sage and warm grey.
 */
const CLASS_TONES = ["var(--color-flow)", "var(--color-good)", "var(--color-ink-soft)"];

export function classTone(group: number): string {
  return CLASS_TONES[Math.abs(Math.trunc(group)) % CLASS_TONES.length] ?? "var(--color-ink)";
}

/** Strongest tint a region reaches, so points stay readable on top. */
const REGION_MAX_PERCENT = 45;

/** Background for a region the model gives to `group`: paper when unsure, tinted when sure. */
export function regionTone(group: number, sureness: number): string {
  const percent = Math.round(clamp01(sureness) * REGION_MAX_PERCENT);
  return `color-mix(in oklab, ${classTone(group)} ${percent}%, var(--color-paper))`;
}

export type TileKind = "floor" | "wall" | "goal" | "trap" | "coin";
const TILE_TONES: Record<TileKind, string> = {
  floor: "var(--color-card)",
  wall: "var(--color-ink-soft)",
  goal: "var(--color-good)",
  trap: "var(--color-bad)",
  coin: "color-mix(in oklab, var(--color-good) 40%, var(--color-card))",
};

/** Board squares: the goal is good, a coin a little good, a trap is bad, walls are plain ink. */
export function tileTone(kind: TileKind): string {
  return TILE_TONES[kind];
}

/** Strongest tint a square's value reaches, so the board stays calm. */
const VALUE_MAX_PERCENT = 55;

/** How good a square is to stand on, from −1 (bad, rose) through 0 (plain) to 1 (good, sage). */
export function valueTone(value: number): string {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
  const percent = Math.round(Math.abs(clamped) * VALUE_MAX_PERCENT);
  const tone = clamped < 0 ? "var(--color-bad)" : "var(--color-good)";
  return `color-mix(in oklab, ${tone} ${percent}%, var(--color-card))`;
}

/**
 * An SVG path through `values`, left to right across `width`, higher values higher up.
 * `range` lets several lines share one scale (a run and its ghost).
 */
export function linePath(
  values: readonly number[],
  width: number,
  height: number,
  range: { min: number; max: number } = extent(values),
): string {
  if (values.length === 0) return "";
  const span = range.max - range.min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const y = height - ((value - range.min) / span) * height;
      return `${index === 0 ? "M" : "L"}${(index * step).toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Smallest and largest finite value (0–1 when there are none). */
export function extent(values: readonly number[]): { min: number; max: number } {
  const finite = values.filter(Number.isFinite);
  return finite.length === 0
    ? { min: 0, max: 1 }
    : { min: Math.min(...finite), max: Math.max(...finite) };
}
