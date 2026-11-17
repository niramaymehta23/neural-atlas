/**
 * Big steps, then small: a ball walks down a valley (seen from the side) following a step plan
 * the learner draws, six parts from start to finish. The valley's slope never gets steeper than
 * one, so plain big steps bounce about the bottom rather than settle; the plan has to shrink
 * them. The sweep (a learning-rate finder) rolls the ball with one fixed step size after
 * another and charts where each ends. Pure: the same state always gives the same walk.
 */
import type { TimelineFrame } from "@/platform/contract";

export const PARTS = 6;
export const STEPS = 60;
const STEPS_PER_PART = STEPS / PARTS;
/** The step size a full-height bar stands for. */
const MOST_STEP = 2.5;
/** The valley: as wide as this at the bottom, slope up to one further out. */
const WIDTH = 0.15;
export const START_X = -1;
/** The slope is drawn this far either side; a ball beyond it has flown off. */
export const EDGE = 1.2;
/** Close enough to the bottom to count as there, and still enough to count as settled. */
export const ARRIVED = 0.05;
const STILL = 0.02;
/** A bar at least this high is a huge step. */
export const HUGE = 0.5;
export const SWEEP_POINTS = 24;

export type View = "plan" | "sweep";
export const VIEWS = ["plan", "sweep"] as const satisfies readonly View[];

export type PlanState = {
  /** Six bar heights 0–1, start first: how big a step in each part of the walk. */
  plan: number[];
  /** "How bold to start", 0–1 on the dial. */
  bold: number;
  /** "How careful to finish", 0–1 on the dial. */
  careful: number;
  /** Walks asked for so far; 0 until the first. */
  runs: number;
  view: View;
};

export type PlanFrame = TimelineFrame & {
  key: string;
  x: number;
  off: boolean;
};

/** The valley's height at `x` (0 at the bottom). */
export const height = (x: number) => WIDTH * (Math.sqrt(1 + (x / WIDTH) ** 2) - 1);
/** The valley's slope at `x`: never steeper than one. */
export const slopeAt = (x: number) => x / WIDTH / Math.sqrt(1 + (x / WIDTH) ** 2);
/** As high as the drawn slope goes: where a ball that flew off is counted. */
export const TOP = height(EDGE);

/** The step size a bar height stands for (squared, so low bars give fine control). */
export const stepFor = (bar: number) => MOST_STEP * Math.min(1, Math.max(0, bar)) ** 2;

/** The plan the two dials draw: bold at the start, each part smaller by "careful". */
export const planFor = (bold: number, careful: number) =>
  Array.from(
    { length: PARTS },
    (_, part) => Math.round(bold * (1 - careful) ** part * 1000) / 1000,
  );

/** The settings a walk depends on, as one string. */
export const keyOf = ({ plan }: Pick<PlanState, "plan">) => plan.join(",");

/** Every position of the walk for a step plan (STEPS + 1 positions). */
export function walk(plan: readonly number[]): { x: number; off: boolean }[] {
  let x = START_X;
  let off = false;
  const spots = [{ x, off }];
  for (let step = 0; step < STEPS; step += 1) {
    if (!off) {
      x -= stepFor(plan[Math.floor(step / STEPS_PER_PART)] ?? 0) * slopeAt(x);
      if (Math.abs(x) > EDGE) {
        off = true;
        x = Math.sign(x) * EDGE;
      }
    }
    spots.push({ x, off });
  }
  return spots;
}

/** Every moment of the walk `state` describes. */
export function rollPlan(state: Pick<PlanState, "plan">): PlanFrame[] {
  const key = keyOf(state);
  return walk(state.plan).map(({ x, off }, epoch) => ({
    epoch,
    key,
    x: Math.round(x * 10000) / 10000,
    off,
    loss: off ? TOP : height(x),
  }));
}

export const isFinished = (
  state: Pick<PlanState, "plan">,
  frame: PlanFrame | undefined,
): frame is PlanFrame => frame !== undefined && frame.key === keyOf(state) && frame.epoch === STEPS;

export type Ending = "settled" | "short" | "bouncing" | "crawling" | "off";

/** A last part with steps smaller than this has stopped the ball, rather than slowed it. */
const STOPPED = 0.0005;

/** How a finished walk ended, from its last few positions and the plan's last part. */
export function ending(
  frames: readonly { x: number; off: boolean }[],
  plan: readonly number[],
): Ending {
  const end = frames.at(-1);
  if (!end) return "crawling";
  if (end.off) return "off";
  const recent = frames.slice(-STEPS_PER_PART - 1);
  let moved = 0;
  for (let index = 1; index < recent.length; index += 1)
    moved += Math.abs((recent[index]?.x ?? 0) - (recent[index - 1]?.x ?? 0));
  if (moved < STILL && Math.abs(end.x) < ARRIVED) return "settled";
  if (moved < STILL && stepFor(plan.at(-1) ?? 0) < STOPPED) return "short";
  // Still moving: crossing the bottom back and forth is bouncing, one way is crawling.
  const crossed = recent.some(
    (spot, index) => index > 0 && Math.sign(spot.x) !== Math.sign(recent[index - 1]?.x ?? 0),
  );
  return crossed ? "bouncing" : "crawling";
}

/** True when every part of the plan is a huge step. */
export const allHuge = (plan: readonly number[]) => plan.every((bar) => bar >= HUGE);

/** The fixed step sizes the sweep tries, as bar heights, smallest first. */
export const SWEEP = Array.from(
  { length: SWEEP_POINTS },
  (_, index) => 0.02 + (index / (SWEEP_POINTS - 1)) * 0.98,
);

const fixed = (bar: number) => Array.from({ length: PARTS }, () => bar);

/** How the walk ends with one fixed step size the whole way. */
export const fixedEnding = (bar: number) => ending(walk(fixed(bar)), fixed(bar));

/** How the walk the plan describes ends. */
export const planEnding = (plan: readonly number[]) => ending(walk(plan), plan);

/** How high the ball ends for each fixed step size of the sweep (the same every time). */
export const SWEEP_ENDS = SWEEP.map((bar) => {
  const end = walk(fixed(bar)).at(-1);
  return !end || end.off ? TOP : height(end.x);
});

/** The sweep point nearest to a bar height. */
export const nearestSweep = (bar: number) =>
  SWEEP.reduce(
    (best, value, index) =>
      Math.abs(value - bar) < Math.abs((SWEEP[best] ?? 0) - bar) ? index : best,
    0,
  );
