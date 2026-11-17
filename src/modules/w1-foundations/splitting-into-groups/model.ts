/**
 * Splitting into groups: two kinds of dots and one straight fence that learns where to stand.
 * The fence is a single cell (a weighted sum of "across" and "up" plus a starting amount); a run
 * is worked out whole from state, so a shared link replays it exactly.
 */
import { makeDataset, type Point } from "@/data/datasets";
import {
  chance,
  createTrainer,
  meanLoss,
  predict,
  startParams,
  type DenseData,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import type { TimelineFrame } from "@/platform/contract";

export const GARDENS = ["apart", "close", "ring", "own"] as const;
export type Garden = (typeof GARDENS)[number];

export type Spot = { x: number; y: number };

export type SplitState = {
  points: Point[];
  /** Which dots it started from ("own" once the learner cleared them). */
  garden: Garden;
  /** What a tap does: add group 0 or 1, or take dots away (ERASER). */
  brush: number;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** "How long it practises", 0–1 on the dial. */
  practice: number;
  /** Fences asked for so far; 0 until the first. A link replays the last one. */
  runs: number;
  /** Where the magnifying glass sits. */
  lens: Spot;
};

/** One moment of a run: the fence then, and how many dots it puts on the right side. */
export type SplitFrame = TimelineFrame & {
  /** The dots and settings this run was worked out for. */
  key: string;
  /** The fence: weight across, weight up, starting amount. */
  params: number[];
  right: number;
  /** The run's last round. */
  rounds: number;
};

export const MAX_POINTS = 200;
export const ERASER = 2;
/** Each group needs this many dots before "no straight fence works" can be judged. */
export const ENOUGH_EACH = 10;
/** A fence that gets fewer than this share right does not work. */
export const NO_FENCE = 0.75;
const STEP_RANGE = { min: 0.01, max: 0.5 };
const ROUNDS = { min: 20, max: 200 };
/** At most this many moments per run, so it plays in a few seconds. */
const MOMENTS = 60;
const SEED = 5;

export const SPEC: DenseSpec = { sizes: [2, 1], bends: [], loss: "logistic" };

export const stepSize = (dial: number) => STEP_RANGE.min + dial * (STEP_RANGE.max - STEP_RANGE.min);
export const roundsFor = (dial: number) =>
  Math.round(ROUNDS.min + dial * (ROUNDS.max - ROUNDS.min));

const round = (value: number) => Math.round(value * 1000) / 1000;
export const roundPoint = ({ x, y, label }: Point): Point => ({ x: round(x), y: round(y), label });

export function plant(garden: Garden): Point[] {
  if (garden === "own") return [];
  const name = garden === "ring" ? "circles" : "blobs";
  const noise = garden === "close" ? 0.42 : garden === "ring" ? 0.05 : 0.12;
  return makeDataset(name, { count: 80, noise, seed: 4 }).map(roundPoint);
}

/** There is something to split: at least one dot of each kind. */
export const canSplit = (points: readonly Point[]) =>
  points.some(({ label }) => label === 0) && points.some(({ label }) => label === 1);

/** The run a state describes: its dots and dials, as one string. */
export const keyOf = ({
  points,
  step,
  practice,
}: Pick<SplitState, "points" | "step" | "practice">) =>
  `${step}|${practice}|${points.map(({ x, y, label }) => `${x},${y},${label}`).join(";")}`;

export const dataOf = (points: readonly Point[]): DenseData => ({
  inputs: points.flatMap(({ x, y }) => [x, y]),
  targets: points.map(({ label }) => label),
});

/** How many dots the fence puts on the right side. */
export function rightCount(points: readonly Point[], params: ArrayLike<number>): number {
  const scores = predict(SPEC, params, dataOf(points).inputs);
  return points.reduce(
    (right, { label }, index) => right + Number((scores[index] ?? 0) > 0 === (label === 1)),
    0,
  );
}

/** Each dot's chance of being the second kind, for the magnifying glass. */
export const chancesFor = (points: readonly Point[], params: ArrayLike<number>) =>
  Float64Array.from(predict(SPEC, params, dataOf(points).inputs), chance);

/** Every moment of the run `state` describes, the untrained fence first. */
export function* fenceRun(state: SplitState): Generator<SplitFrame> {
  const key = keyOf(state);
  const rounds = roundsFor(state.practice);
  const data = dataOf(state.points);
  const trainer = createTrainer(SPEC, startParams(SPEC.sizes, { seed: SEED }), data, {
    optimiser: "adam",
    learningRate: stepSize(state.step),
    seed: SEED,
  });
  const every = Math.max(1, Math.ceil(rounds / MOMENTS));
  const frame = (epoch: number): SplitFrame => ({
    epoch,
    key,
    loss: meanLoss(SPEC, trainer.params, data),
    params: Array.from(trainer.params, round),
    right: rightCount(state.points, trainer.params),
    rounds,
  });
  yield frame(0);
  for (let epoch = 1; epoch <= rounds; epoch += 1) {
    trainer.round();
    if (epoch % every === 0 || epoch === rounds) yield frame(epoch);
  }
}

/** True when `frame` is the finished fence for the dots and dials `state` holds now. */
export const isFinished = (state: SplitState, frame: SplitFrame | undefined): frame is SplitFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** Where the fence crosses the square, as two ends in −1…1 (null when it misses the square). */
export function fenceEnds(params: readonly number[]): [Spot, Spot] | null {
  const [a = 0, b = 0, c = 0] = params;
  const ends: Spot[] = [];
  const add = (spot: Spot) => {
    if (Math.abs(spot.x) <= 1.0001 && Math.abs(spot.y) <= 1.0001) ends.push(spot);
  };
  if (Math.abs(b) > 1e-9) for (const x of [-1, 1]) add({ x, y: -(a * x + c) / b });
  if (Math.abs(a) > 1e-9) for (const y of [-1, 1]) add({ x: -(b * y + c) / a, y });
  const [first, ...rest] = ends;
  const far = rest.reduce<Spot | undefined>(
    (best, spot) =>
      !first ||
      (best &&
        Math.hypot(best.x - first.x, best.y - first.y) >=
          Math.hypot(spot.x - first.x, spot.y - first.y))
        ? best
        : spot,
    undefined,
  );
  return first && far && Math.hypot(far.x - first.x, far.y - first.y) > 1e-6 ? [first, far] : null;
}
