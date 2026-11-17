import { gridInputs, type Point } from "@/data/datasets";
import { fieldOf } from "@/engine/ml/field";
import {
  buildRoad,
  lampPosts,
  roadClassifier,
  roadSide,
  type Kernel,
  type Road,
} from "@/engine/ml/svm";
import { plantGarden } from "@/features/classic/garden";
import { rememberLast } from "@/features/classic/memo";

export const GARDENS = ["blobs", "moons", "circles", "own"] as const;
export type Garden = (typeof GARDENS)[number];
export const GROUNDS = ["flat", "bowl", "bumps"] as const satisfies readonly Kernel[];
export const FIELD = 48;
export const CONTOUR = 40;
const GRID = gridInputs(FIELD);
const CONTOUR_GRID = gridInputs(CONTOUR);

export type RoadState = {
  garden: Garden;
  points: Point[];
  brush: number;
  /** 0: lets houses sit in the road; 1: keeps every house out (the penalty C, on a log scale). */
  strict: number;
  /** How high the lift is (bowl) or how narrow each hill (bumps). */
  lift: number;
  ground: Kernel;
  /** The last house pulled up, kept so the road it held (or did not hold) can be compared. */
  pulled: Point | null;
};

/** A road that moved this far (in road widths) somewhere on the map has moved. */
const MOVED = 0.05;

export const penalty = (strict: number) => 10 ** (-1 + 3 * strict);
export const liftOf = (ground: Kernel, lift: number) =>
  ground === "bowl" ? 0.5 + 3.5 * lift : ground === "bumps" ? 1 + 19 * lift : 0;

export const roadFor = rememberLast(
  (points: readonly Point[], ground: Kernel, lift: number, strict: number): Road =>
    buildRoad(points, { kernel: ground, lift: liftOf(ground, lift), strict: penalty(strict) }),
);

export const roadOf = (state: RoadState) =>
  roadFor(state.points, state.ground, state.lift, state.strict);

export const fieldOfRoad = rememberLast((road: Road) => fieldOf(roadClassifier(road), GRID, 2));

/** The road's middle line and its two edges, sampled for drawing. */
export const roadSamples = rememberLast((road: Road) => {
  const side = roadSide(road);
  return Float32Array.from({ length: CONTOUR * CONTOUR }, (_, at) =>
    side(CONTOUR_GRID[at * 2] ?? 0, CONTOUR_GRID[at * 2 + 1] ?? 0),
  );
});

/** True when both groups are there, so a road can be built. */
export const canBuild = (points: readonly Point[]) =>
  points.some((point) => point.label === 0) && points.some((point) => point.label === 1);

/** The houses on the wrong side of the road's middle. */
export function wrongSide(road: Road, points: readonly Point[]): number {
  const side = roadSide(road);
  return points.filter((point) => side(point.x, point.y) > 0 !== (point.label === 1)).length;
}

const withPulled = rememberLast((points: readonly Point[], pulled: Point) => [...points, pulled]);

/** The road as it was before the last pull, under today's settings. */
function roadBefore(state: RoadState): Road | null {
  if (!state.pulled) return null;
  return roadFor(withPulled(state.points, state.pulled), state.ground, state.lift, state.strict);
}

/** Whether the pulled house was holding the road up. */
export function pulledPost(state: RoadState): boolean | null {
  const before = roadBefore(state);
  if (!before) return null;
  return lampPosts(before).includes(before.dots.length - 1);
}

/** Whether pulling the house up moved the road anywhere on the map. */
export function roadMoved(state: RoadState): boolean | null {
  const before = roadBefore(state);
  if (!before || !canBuild(state.points)) return null;
  const was = roadSamples(before);
  const now = roadSamples(roadOf(state));
  return was.some((value, at) => Math.abs(value - (now[at] ?? 0)) > MOVED);
}

export const plantVillages = (garden: Garden) => plantGarden(garden, 4);
