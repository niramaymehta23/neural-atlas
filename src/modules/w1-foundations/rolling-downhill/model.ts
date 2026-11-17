/**
 * Three walkers going downhill on a valley of mistakes, step by step: a steady walker (plain
 * steps), a rolling ball (keeps some of its speed) and a careful stepper (adapts its stride).
 * Pure and deterministic: the same state always gives the same run.
 */
import { createOptimiser, type OptimiserKind, type Param } from "@/engine/autodiff/optimisers";
import type { TimelineFrame } from "@/platform/contract";

export const VALLEYS = ["bowl", "ravine", "pass", "bumpy"] as const;
export type Valley = (typeof VALLEYS)[number];

/**
 * Mistake size at each spot of the −1…1 ground; every valley curls up at the edges and none
 * goes below zero (the bumpy field is lifted by its deepest dip, DH-06).
 */
export const HEIGHTS: Record<Valley, (x: number, z: number) => number> = {
  bowl: (x, z) => 0.5 * x * x + 1.5 * z * z,
  ravine: (x, z) => 0.15 * x * x + 3 * z * z,
  pass: (x, z) => 0.8 * x * x + 1.2 * (z * z - 0.3) ** 2,
  bumpy: (x, z) => 0.6 * (x * x + z * z) + 0.08 * (Math.sin(7 * x) + Math.sin(7 * z)) + 0.16,
};

/** The highest mistake on each valley's map: where a walker that flew off is counted. */
export const TOP: Record<Valley, number> = Object.fromEntries(
  VALLEYS.map((valley) => {
    const height = HEIGHTS[valley];
    let top = -Infinity;
    for (let i = 0; i <= 200; i += 1)
      for (let j = 0; j <= 200; j += 1) top = Math.max(top, height(i / 100 - 1, j / 100 - 1));
    return [valley, top];
  }),
) as Record<Valley, number>;

export const WALKERS = ["sgd", "momentum", "adam"] as const satisfies readonly OptimiserKind[];
export type Walker = (typeof WALKERS)[number];

export type Spot = { x: number; z: number };

export type DownhillState = {
  valley: Valley;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** "How much it keeps rolling", 0–1 on the dial: the rolling ball's memory. */
  keepRolling: number;
  start: Spot;
  /** How many times the walkers have been let go; 0 until the first. */
  runs: number;
  /** Where the learner guessed each walker would stop (in walker order), for one roll. */
  marks: Spot[];
  /** The roll the marks are for: `runs + 1` while waiting, `runs` once that roll happened. */
  marksFor: number;
};

export type WalkerAt = Spot & { off: boolean };

export type DownhillFrame = TimelineFrame & {
  walkers: WalkerAt[];
  /** The step each walker settled at the bottom, or null while it is still moving. */
  settled: (number | null)[];
  /** The step each walker left the map at, or null while it is on it. */
  offAt: (number | null)[];
};

export const STEPS = 120;
const STEP_RANGE = { min: 0.02, max: 1 };
const KEEP_ROLLING_MAX = 0.98;
const SLOPE_GAP = 1e-4;
const BEND_GAP = 1e-3;
/** A walker counts as settled once the ground is this flat and it barely moves. */
const SETTLED = { slope: 0.02, moved: 0.002 };
/**
 * Where each walker starts, around the chosen spot: a little apart, so all three show at the
 * start (DH-08). The steady walker starts on the spot itself.
 */
export const START_OFFSETS: readonly Spot[] = [
  { x: 0, z: 0 },
  { x: -0.22, z: 0 },
  { x: -0.1, z: -0.24 },
];
/** Starts stay this far inside the map's edge. */
const START_EDGE = 0.98;
/** A guess this close to where a walker stopped counts as close. */
export const CLOSE = 0.2;

/** The learning rate a "How big a step" dial position stands for. */
export const stepSize = (dial: number) => STEP_RANGE.min + dial * (STEP_RANGE.max - STEP_RANGE.min);
/** The dial position for a learning rate (the inverse of `stepSize`). */
export const dialFor = (size: number) =>
  (size - STEP_RANGE.min) / (STEP_RANGE.max - STEP_RANGE.min);

/** The slope under a walker's feet, by central differences. */
export function slope(valley: Valley, { x, z }: Spot): Spot {
  const height = HEIGHTS[valley];
  return {
    x: (height(x + SLOPE_GAP, z) - height(x - SLOPE_GAP, z)) / (2 * SLOPE_GAP),
    z: (height(x, z + SLOPE_GAP) - height(x, z - SLOPE_GAP)) / (2 * SLOPE_GAP),
  };
}

/** True where the ground curves up in every direction: a real dip, not a saddle or a ridge. */
export function curvesUp(valley: Valley, { x, z }: Spot): boolean {
  const h = HEIGHTS[valley];
  const g = BEND_GAP;
  const centre = h(x, z);
  const xx = (h(x + g, z) - 2 * centre + h(x - g, z)) / (g * g);
  const zz = (h(x, z + g) - 2 * centre + h(x, z - g)) / (g * g);
  const xz = (h(x + g, z + g) - h(x + g, z - g) - h(x - g, z + g) + h(x - g, z - g)) / (4 * g * g);
  return xx > 0 && xx * zz - xz * xz > 0;
}

const onMap = ({ x, z }: Spot) =>
  Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 1 && Math.abs(z) <= 1;

/** `from` moved by `by`, the other way when that would leave the map, so walkers never stack. */
const inside = (from: number, by: number) => {
  const to = Math.abs(from + by) <= START_EDGE ? from + by : from - by;
  return Math.max(-START_EDGE, Math.min(START_EDGE, to));
};

/** Where each walker starts for a chosen spot. */
export const startsFor = (start: Spot): Spot[] =>
  START_OFFSETS.map(({ x, z }) => ({ x: inside(start.x, x), z: inside(start.z, z) }));

/** Every step of one run, start included (STEPS + 1 frames). */
export function rollDown(
  state: Pick<DownhillState, "valley" | "step" | "keepRolling" | "start">,
): DownhillFrame[] {
  const { valley } = state;
  const height = HEIGHTS[valley];
  const walkers = WALKERS.map((kind, index) => {
    const from = startsFor(state.start)[index] ?? state.start;
    const params: [Param, Param] = [
      { data: from.x, grad: 0 },
      { data: from.z, grad: 0 },
    ];
    const optimiser = createOptimiser({
      kind,
      learningRate: stepSize(state.step),
      momentum: state.keepRolling * KEEP_ROLLING_MAX,
    });
    return { params, optimiser, offAt: null as number | null, settled: null as number | null };
  });
  const frameAt = (epoch: number): DownhillFrame => {
    const spots = walkers.map(({ params: [x, z], offAt }) => ({
      x: x.data,
      z: z.data,
      off: offAt !== null,
    }));
    return {
      epoch,
      // A walker that flew off is as wrong as the map goes, so leaving never looks like progress.
      loss:
        spots.reduce((sum, spot) => sum + (spot.off ? TOP[valley] : height(spot.x, spot.z)), 0) /
        spots.length,
      walkers: spots,
      settled: walkers.map(({ settled }) => settled),
      offAt: walkers.map(({ offAt }) => offAt),
    };
  };

  const frames = [frameAt(0)];
  for (let epoch = 1; epoch <= STEPS; epoch += 1) {
    for (const walker of walkers) {
      if (walker.offAt !== null) continue;
      const [x, z] = walker.params;
      const before = { x: x.data, z: z.data };
      const ground = slope(valley, before);
      x.grad = ground.x;
      z.grad = ground.z;
      walker.optimiser.step(walker.params);
      const after = { x: x.data, z: z.data };
      if (!onMap(after)) {
        // Frozen where it left the map, so its trail ends at the edge. It never settles.
        walker.offAt = epoch;
        walker.settled = null;
        x.data = Math.max(-1, Math.min(1, Number.isFinite(after.x) ? after.x : before.x));
        z.data = Math.max(-1, Math.min(1, Number.isFinite(after.z) ? after.z : before.z));
        continue;
      }
      // Settled: still, on flat ground that curves up all round (a saddle's flat top is no bottom).
      const flat = Math.hypot(ground.x, ground.z) < SETTLED.slope;
      const still = Math.hypot(after.x - before.x, after.z - before.z) < SETTLED.moved;
      const resting = flat && still && curvesUp(valley, after);
      if (walker.settled === null && resting) walker.settled = epoch;
      else if (walker.settled !== null && !resting) walker.settled = null;
    }
    frames.push(frameAt(epoch));
  }
  return frames;
}

/** True once the steady walker has left the map: its steps alone were too big (DH-04). */
export const steadyFlewOff = (frame: DownhillFrame | undefined) => frame?.walkers[0]?.off ?? false;

/** The step the steady walker left the map at, if it did. */
export const steadyOffAt = (frame: DownhillFrame | undefined) => frame?.offAt[0] ?? null;

export type Outcome = Walker | "none" | "tie";
export const OUTCOMES = [...WALKERS, "none", "tie"] as const satisfies readonly Outcome[];

/**
 * Who settled at the bottom first, once the run is over: a walker, "tie" when several settled
 * on the same step, or "none" when none settled (all flew off, or kept going) (DH-03).
 */
export function firstToSettle(frame: DownhillFrame | undefined): Outcome | null {
  if (!frame || frame.epoch < STEPS) return null;
  const settled = frame.settled.flatMap((step, index) =>
    step === null || frame.walkers[index]?.off ? [] : [{ step, walker: WALKERS[index] }],
  );
  if (settled.length === 0) return "none";
  const first = Math.min(...settled.map(({ step }) => step));
  const winners = settled.filter(({ step }) => step === first);
  return winners.length > 1 ? "tie" : (winners[0]?.walker ?? "none");
}

/** What happened to each of the learner's guesses, once the roll they were for is over. */
export function guessesAgainst(
  marks: readonly Spot[],
  frame: DownhillFrame | undefined,
): ("close" | "far" | "off" | null)[] {
  return WALKERS.map((_, index) => {
    const mark = marks[index];
    const at = frame?.walkers[index];
    if (!mark || !at || !frame || frame.epoch < STEPS) return null;
    if (at.off) return "off";
    return Math.hypot(at.x - mark.x, at.z - mark.z) <= CLOSE ? "close" : "far";
  });
}

/** The marks shown now: those for the coming roll, or for the roll on screen. */
export const shownMarks = ({
  marks,
  marksFor,
  runs,
}: Pick<DownhillState, "marks" | "marksFor" | "runs">) =>
  marksFor === runs + 1 || marksFor === runs ? marks : [];

/** The marks with a new guess placed: the next walker's, starting afresh after a roll. */
export function placeMark(state: Pick<DownhillState, "marks" | "marksFor" | "runs">, at: Spot) {
  const fresh = state.marksFor !== state.runs + 1;
  const marks = fresh ? [] : state.marks;
  return {
    marks: marks.length < WALKERS.length ? [...marks, at] : [...marks.slice(1), at],
    marksFor: state.runs + 1,
  };
}
