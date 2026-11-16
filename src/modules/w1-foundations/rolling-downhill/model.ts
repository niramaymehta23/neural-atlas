/**
 * Three walkers going downhill on a valley of mistakes, step by step: a steady walker (plain
 * steps), a rolling ball (keeps some of its speed) and a careful stepper (adapts its stride).
 * Pure and deterministic: the same state always gives the same run.
 */
import { createOptimiser, type OptimiserKind, type Param } from "@/engine/autodiff/optimisers";
import type { TimelineFrame } from "@/platform/contract";

export const VALLEYS = ["bowl", "ravine", "pass", "bumpy"] as const;
export type Valley = (typeof VALLEYS)[number];

/** Mistake size at each spot of the −1…1 ground; every valley curls up at the edges. */
export const HEIGHTS: Record<Valley, (x: number, z: number) => number> = {
  bowl: (x, z) => 0.5 * x * x + 1.5 * z * z,
  ravine: (x, z) => 0.15 * x * x + 3 * z * z,
  pass: (x, z) => 0.8 * x * x + 1.2 * (z * z - 0.3) ** 2,
  bumpy: (x, z) => 0.6 * (x * x + z * z) + 0.08 * (Math.sin(7 * x) + Math.sin(7 * z)),
};

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
};

export type WalkerAt = Spot & { off: boolean };

export type DownhillFrame = TimelineFrame & {
  walkers: WalkerAt[];
  /** The step each walker settled at the bottom, or null while it is still moving. */
  settled: (number | null)[];
};

export const STEPS = 120;
const STEP_RANGE = { min: 0.02, max: 1 };
const KEEP_ROLLING_MAX = 0.98;
const SLOPE_GAP = 1e-4;
/** A walker counts as settled once the ground is this flat and it barely moves. */
const SETTLED = { slope: 0.02, moved: 0.002 };

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

const onMap = ({ x, z }: Spot) =>
  Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 1 && Math.abs(z) <= 1;

/** Every step of one run, start included (STEPS + 1 frames). */
export function rollDown(state: DownhillState): DownhillFrame[] {
  const { valley, start } = state;
  const height = HEIGHTS[valley];
  const walkers = WALKERS.map((kind) => {
    const params: [Param, Param] = [
      { data: start.x, grad: 0 },
      { data: start.z, grad: 0 },
    ];
    const optimiser = createOptimiser({
      kind,
      learningRate: stepSize(state.step),
      momentum: state.keepRolling * KEEP_ROLLING_MAX,
    });
    return { params, optimiser, off: false, settled: null as number | null };
  });
  const frameAt = (epoch: number): DownhillFrame => {
    const spots = walkers.map(({ params: [x, z], off }) => ({ x: x.data, z: z.data, off }));
    const onGround = spots.filter(({ off }) => !off);
    return {
      epoch,
      loss: onGround.length
        ? onGround.reduce((sum, spot) => sum + height(spot.x, spot.z), 0) / onGround.length
        : 0,
      walkers: spots,
      settled: walkers.map(({ settled }) => settled),
    };
  };

  const frames = [frameAt(0)];
  for (let epoch = 1; epoch <= STEPS; epoch += 1) {
    for (const walker of walkers) {
      if (walker.off) continue;
      const [x, z] = walker.params;
      const before = { x: x.data, z: z.data };
      const ground = slope(valley, before);
      x.grad = ground.x;
      z.grad = ground.z;
      walker.optimiser.step(walker.params);
      const after = { x: x.data, z: z.data };
      if (!onMap(after)) {
        // Frozen where it left the map, so its trail ends at the edge.
        walker.off = true;
        x.data = Math.max(-1, Math.min(1, Number.isFinite(after.x) ? after.x : before.x));
        z.data = Math.max(-1, Math.min(1, Number.isFinite(after.z) ? after.z : before.z));
        continue;
      }
      const flat = Math.hypot(ground.x, ground.z) < SETTLED.slope;
      const still = Math.hypot(after.x - before.x, after.z - before.z) < SETTLED.moved;
      if (walker.settled === null && flat && still) walker.settled = epoch;
      else if (walker.settled !== null && !(flat && still)) walker.settled = null;
    }
    frames.push(frameAt(epoch));
  }
  return frames;
}

/** True once any walker has left the map. */
export const flewOff = (frame: DownhillFrame | undefined) =>
  frame?.walkers.some(({ off }) => off) ?? false;

/** The walker that settled first (the lowest one if none did), once the run is over. */
export function firstToSettle(frame: DownhillFrame | undefined, valley: Valley): Walker | null {
  if (!frame || frame.epoch < STEPS) return null;
  const height = HEIGHTS[valley];
  const order = WALKERS.map((walker, index) => ({
    walker,
    settled: frame.settled[index] ?? Infinity,
    low: frame.walkers[index]?.off
      ? Infinity
      : height(frame.walkers[index]?.x ?? 0, frame.walkers[index]?.z ?? 0),
  })).sort((a, b) => a.settled - b.settled || a.low - b.low);
  return order[0]?.walker ?? null;
}
