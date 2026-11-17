/**
 * Smarter ways downhill: the three walkers of the landscape race, racing on purpose. The batch
 * blender is the "How many examples it checks each step" dial: checking few examples makes the
 * slope each walker feels wobble (`jitter`), checking them all makes it smooth. A run is worked
 * out whole from state (seeded), so a shared link replays it exactly.
 */
import {
  HEIGHTS,
  rollDown,
  STEPS,
  TOP,
  WALKERS,
  type RaceFrame,
  type Spot,
  type Valley,
  type Walker,
} from "@/features/building/race/race";

export type SmarterState = {
  valley: Valley;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** "How many examples it checks each step", 0 (a few) to 1 (all of them). */
  examples: number;
  start: Spot;
  /** Races run so far; 0 until the first. A link replays the last one. */
  runs: number;
};

/** One moment of a race, labelled with the settings it was run with. */
export type SmarterFrame = RaceFrame & { key: string };

/** The rolling ball keeps this much of its speed each step. */
export const KEEP_ROLLING = 0.9;
/** The most the felt slope wobbles, when it checks only a few examples. */
const MOST_JITTER = 0.4;
/** Ending this much higher than the lowest walker counts as losing (a dip, not a wobble). */
export const LOSING_GAP = 0.05;
/** Walkers ending within this of each other count as level. */
export const LEVEL = 0.005;
const SEED = 3;

/** How much the felt slope wobbles for an "examples" dial position. */
export const jitterFor = (examples: number) =>
  MOST_JITTER * Math.max(0, 1 - Math.min(1, Math.max(0, examples))) ** 1.5;

/** The settings a race depends on, as one string. */
export const keyOf = ({ valley, step, examples, start }: SmarterState) =>
  `${valley}|${step}|${examples}|${start.x},${start.z}`;

/** Every moment of the race `state` describes. */
export function race(state: SmarterState): SmarterFrame[] {
  const key = keyOf(state);
  return rollDown({
    valley: state.valley,
    step: state.step,
    keepRolling: KEEP_ROLLING,
    start: state.start,
    jitter: jitterFor(state.examples),
    seed: SEED + state.runs,
  }).map((frame) => ({ ...frame, key }));
}

/** True when `frame` is the end of the race the dials on screen describe. */
export const isFinished = (
  state: SmarterState,
  frame: SmarterFrame | undefined,
): frame is SmarterFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === STEPS;

/** How high each walker ended: a walker that flew off counts as high as the map goes. */
export function endHeights(valley: Valley, frame: RaceFrame): number[] {
  return frame.walkers.map((at) => (at.off ? TOP[valley] : HEIGHTS[valley](at.x, at.z)));
}

export type Result = { level: true } | { level: false; lowest: Walker; last: Walker };

/** Who ended lowest and who came last, or that they ended level. */
export function result(valley: Valley, frame: RaceFrame): Result {
  const heights = endHeights(valley, frame);
  const order = WALKERS.map((walker, index) => ({ walker, height: heights[index] ?? 0 })).sort(
    (a, b) => a.height - b.height,
  );
  const lowest = order[0];
  const last = order.at(-1);
  if (!lowest || !last || last.height - lowest.height <= LEVEL) return { level: true };
  return { level: false, lowest: lowest.walker, last: last.walker };
}

/**
 * The careful stepper lost: it flew off while another walker stayed on the map, or it ended
 * clearly higher than the lowest of the others (stuck above a dip they dropped into).
 */
export function carefulLost(valley: Valley, frame: RaceFrame): boolean {
  const heights = endHeights(valley, frame);
  const [steady = 0, rolling = 0, careful = 0] = heights;
  const offs = frame.walkers.map(({ off }) => off);
  if (offs[2]) return !offs[0] || !offs[1];
  return careful > Math.min(steady, rolling) + LOSING_GAP;
}
