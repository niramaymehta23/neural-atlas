/**
 * Gardens of two kinds of dots for the 2D World 2 lessons: seeded presets from DataKit, the
 * learner's own dots kept small and well-formed, and a second batch of "new dots" from the same
 * recipe to test on.
 */
import { makeDataset, type DatasetName, type Point } from "@/data/datasets";

/** The most dots a garden holds: enough to draw any shape, few enough for links and fast fits. */
export const MAX_DOTS = 300;

export const PRESETS = [
  "blobs",
  "moons",
  "circles",
  "xor",
] as const satisfies readonly DatasetName[];
export type Preset = (typeof PRESETS)[number];
export type GardenName = Preset | "own";
export const GARDEN_NAMES: readonly GardenName[] = [...PRESETS, "own"];

/** Dots per preset, and how far each one wobbles: enough overlap that a perfect score means cramming. */
const RECIPE: Record<Preset, { count: number; noise: number }> = {
  blobs: { count: 120, noise: 0.12 },
  moons: { count: 120, noise: 0.25 },
  circles: { count: 120, noise: 0.15 },
  xor: { count: 120, noise: 0.12 },
};
/** New dots come from a different seed, so none of them is one the lesson learned from. */
const FRESH_SEED = 1000;
const FRESH_COUNT = 200;

/** Positions are kept to three decimals, so links stay short and replay to the same view. */
export const roundDot = ({ x, y, label }: Point): Point => ({
  x: Math.round(x * 1000) / 1000,
  y: Math.round(y * 1000) / 1000,
  label,
});

/** The preset's dots (empty for the learner's own garden). */
export function plantGarden(name: GardenName, seed = 1): Point[] {
  if (name === "own") return [];
  return makeDataset(name, { ...RECIPE[name], seed }).map(roundDot);
}

/** New dots from the same recipe, never learned from; none for the learner's own garden. */
export function newDots(name: GardenName, seed = 1): Point[] {
  if (name === "own") return [];
  return makeDataset(name, { ...RECIPE[name], count: FRESH_COUNT, seed: seed + FRESH_SEED }).map(
    roundDot,
  );
}

/** A dot a link may carry: inside the square, in one of `groups` groups. */
export const isDot =
  (groups = 2) =>
  (item: unknown): item is Point => {
    const dot = item as Partial<Point> | null;
    return (
      typeof dot?.x === "number" &&
      typeof dot.y === "number" &&
      Number.isFinite(dot.x) &&
      Number.isFinite(dot.y) &&
      Math.abs(dot.x) <= 1 &&
      Math.abs(dot.y) <= 1 &&
      typeof dot.label === "number" &&
      Number.isInteger(dot.label) &&
      dot.label >= 0 &&
      dot.label < groups
    );
  };

/** A link's dots made safe: well-formed ones only, rounded, at most `max`. */
export function parseDots(saved: unknown, groups = 2, max = MAX_DOTS): Point[] {
  if (!Array.isArray(saved)) return [];
  return saved.filter(isDot(groups)).slice(0, max).map(roundDot);
}

/** Adds dots up to the cap; `full` says some did not fit. */
export function plantInto(dots: readonly Point[], batch: readonly Point[], max = MAX_DOTS) {
  const room = Math.max(0, max - dots.length);
  return { dots: [...dots, ...batch.slice(0, room).map(roundDot)], full: batch.length > room };
}

/** True when there is something to learn: dots of both groups. */
export const hasBothGroups = (dots: readonly Point[]) =>
  dots.some((dot) => dot.label === 0) && dots.some((dot) => dot.label === 1);

/** The garden part of a lesson's link, made safe: a known garden, its dots, a known brush. */
export function parseGarden<G extends string>(
  saved: { garden: unknown; points: unknown; brush: unknown },
  gardens: readonly G[],
  fallback: G,
  brushes: number,
) {
  const brush = typeof saved.brush === "number" ? Math.round(saved.brush) : 0;
  return {
    garden: gardens.includes(saved.garden as G) ? (saved.garden as G) : fallback,
    points: parseDots(saved.points),
    brush: Math.min(brushes - 1, Math.max(0, Number.isFinite(brush) ? brush : 0)),
  };
}
