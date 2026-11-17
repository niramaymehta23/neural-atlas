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

/** Negative connections are dashed as well as rose, so the sign reads without colour (A11Y-07). */
export function weightDash(weight: number, width: number): string | undefined {
  if (!(weight < 0)) return undefined;
  const round = (value: number) => Math.round(value * 100) / 100;
  return `${round(width * 1.5 + 3)} ${round(width + 3)}`;
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

/** Groups differ in shape as well as colour, so they read without colour vision (A11Y-08). */
export type ClassShape = "circle" | "triangle" | "square";
const CLASS_SHAPES: readonly ClassShape[] = ["circle", "triangle", "square"];

export function classMark(group: number): ClassShape {
  return CLASS_SHAPES[Math.abs(Math.trunc(group)) % CLASS_SHAPES.length] ?? "circle";
}

/** An SVG path for a group's shape centred on (x, y), about `r` from centre to edge. */
export function markPath(shape: ClassShape, x: number, y: number, r: number): string {
  const at = (dx: number, dy: number) => `${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`;
  if (shape === "triangle")
    return `M${at(0, -r * 1.2)} L${at(r * 1.1, r * 0.7)} L${at(-r * 1.1, r * 0.7)} Z`;
  if (shape === "square")
    return `M${at(-r * 0.9, -r * 0.9)} H${(x + r * 0.9).toFixed(2)} V${(y + r * 0.9).toFixed(2)} H${(x - r * 0.9).toFixed(2)} Z`;
  return `M${at(-r, 0)} A${r} ${r} 0 1 0 ${at(r, 0)} A${r} ${r} 0 1 0 ${at(-r, 0)} Z`;
}

/** Strongest tint a region reaches, so points stay readable on top. */
const REGION_MAX_PERCENT = 45;

/** Background for a region the model gives to `group`: paper when unsure, tinted when sure. */
export function regionTone(group: number, sureness: number): string {
  const percent = Math.round(clamp01(sureness) * REGION_MAX_PERCENT);
  return `color-mix(in oklab, ${classTone(group)} ${percent}%, var(--color-paper))`;
}

/**
 * The six worlds of the home map, each a soft warm tint (the base softened with sand). Clay is
 * not among them: on the map it means "learned".
 */
const WORLD_BASES = [
  "var(--color-flow)",
  "var(--color-good)",
  "var(--color-ink-soft)",
  "var(--color-bad)",
  "color-mix(in oklab, var(--color-flow), var(--color-good))",
  "color-mix(in oklab, var(--color-bad), var(--color-ink-soft))",
];

/** Tint for world 1…6. */
export function worldTone(world: number): string {
  const base = WORLD_BASES[world - 1];
  return `color-mix(in oklab, ${base ?? "var(--color-ink-soft)"} 60%, var(--color-sand))`;
}

/** An idea the learner has mastered fills with clay. */
export const learnedTone = "var(--color-accent)";

/** The thin warm line from an idea to the one it builds on. */
export const linkTone = "color-mix(in oklab, var(--color-ink-soft) 55%, var(--color-sand))";

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

/** A cut-paper glyph per special square, drawn in ink in a 0–1 box, so kinds read without colour. */
export type TileMark = "bowl" | "lava" | "treat" | "hatch";
const TILE_MARKS: Record<TileKind, TileMark | null> = {
  floor: null,
  wall: "hatch",
  goal: "bowl",
  trap: "lava",
  coin: "treat",
};
const TILE_MARK_PATHS: Record<TileMark, string> = {
  bowl: "M0.25 0.48 H0.75 Q0.72 0.74 0.5 0.74 Q0.28 0.74 0.25 0.48 Z",
  lava: "M0.24 0.42 Q0.37 0.3 0.5 0.42 T0.76 0.42 M0.24 0.62 Q0.37 0.5 0.5 0.62 T0.76 0.62",
  treat: "M0.5 0.3 L0.68 0.5 L0.5 0.7 L0.32 0.5 Z",
  hatch: "M0.2 0.5 L0.5 0.2 M0.2 0.8 L0.8 0.2 M0.5 0.8 L0.8 0.5",
};

export function tileMark(kind: TileKind): { name: TileMark; path: string } | null {
  const name = TILE_MARKS[kind];
  return name ? { name, path: TILE_MARK_PATHS[name] } : null;
}

/** Values closer to zero than this get no sign: the square is plain. */
const SIGN_FROM = 0.1;

/** A small + or − in a square's corner (0–1 box), so good and bad read without colour. */
export function valueMark(value: number): { sign: "plus" | "minus"; path: string } | null {
  if (!Number.isFinite(value) || Math.abs(value) < SIGN_FROM) return null;
  return value > 0
    ? { sign: "plus", path: "M0.78 0.2 H0.92 M0.85 0.13 V0.27" }
    : { sign: "minus", path: "M0.78 0.2 H0.92" };
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
