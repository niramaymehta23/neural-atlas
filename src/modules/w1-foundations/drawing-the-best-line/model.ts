/**
 * Drawing the best line: dots, a line the learner holds by two handles, and a walk downhill from
 * the learner's line to the line with the smallest squared misses. A run is a pure function of
 * state (the dots, the learner's line and the run counter), so a shared link replays it.
 */
import { fitCurve } from "@/engine/fit/least-squares";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type Dot = { x: number; y: number };

export type LineState = {
  /** The learner's line, by its height at the left handle and at the right handle. */
  line: { left: number; right: number };
  /** Dots the learner added by tapping (drawn as triangles). */
  added: Dot[];
  /** "How spread out the dots are", 0–1 on the dial. */
  spread: number;
  /** "How many dots", 0–1 on the dial. */
  dots: number;
  /** Walks to the best line asked for so far; 0 until the first. */
  runs: number;
};

/** One moment of the walk: the line then, by its two handle heights. */
export type LineFrame = TimelineFrame & { key: string; left: number; right: number; steps: number };

/** Where the two handles sit across the field. */
export const HANDLE_X = 0.8;
export const MAX_ADDED = 12;
export const DOTS = { min: 5, max: 30 };
/** The walk: how many steps, how big, and how many moments are kept. */
const STEPS = 120;
const RATE = 0.45;
const EVERY = 2;
/** A dot this far (up or down) from the line through the other dots counts as crazy. */
export const CRAZY = 0.7;
/** The best line counts as tilted when its slope changes by this much. */
export const TILTED = 0.12;
/** It counts as having barely moved when both handles moved less than this. */
export const BARELY = 0.06;
const TRUE_LINE = { slope: 0.45, height: -0.05 };
const SEED = 13;

export const dotCount = (dial: number) =>
  Math.round(DOTS.min + Math.min(1, Math.max(0, dial)) * (DOTS.max - DOTS.min));

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const clamp1 = (value: number) => Math.max(-1, Math.min(1, value));
export const roundDot = ({ x, y }: Dot): Dot => ({ x: round3(clamp1(x)), y: round3(clamp1(y)) });

/** The lesson's own dots, near a gentle line; more spread out as the dial turns up. */
export function baseDots({ spread, dots }: Pick<LineState, "spread" | "dots">): Dot[] {
  const random = createRandom(SEED);
  // The same draws for every dial position, so the dial only spreads the dots out.
  return Array.from({ length: DOTS.max }, (_, index) => {
    const x = -0.9 + (1.8 * (index + random.next())) / DOTS.max;
    const jitter = random.normal();
    return roundDot({
      x,
      y: TRUE_LINE.height + TRUE_LINE.slope * x + jitter * (0.04 + spread * 0.3),
    });
  })
    .filter((_, index) => index % Math.max(1, Math.floor(DOTS.max / dotCount(dots))) === 0)
    .slice(0, dotCount(dots));
}

export const allDots = (state: Pick<LineState, "spread" | "dots" | "added">) => [
  ...baseDots(state),
  ...state.added,
];

/** Slope and height of a line given by its two handle heights. */
export const slopeOf = ({ left, right }: { left: number; right: number }) => ({
  slope: (right - left) / (2 * HANDLE_X),
  height: (left + right) / 2,
});
export const handlesOf = ({ slope, height }: { slope: number; height: number }) => ({
  left: height - slope * HANDLE_X,
  right: height + slope * HANDLE_X,
});

export const lineAt = (line: { left: number; right: number }, x: number) => {
  const { slope, height } = slopeOf(line);
  return height + slope * x;
};

/** The mean of the squared misses: how far off the line is, all together. */
export function meanMiss(dots: readonly Dot[], line: { left: number; right: number }) {
  if (dots.length === 0) return 0;
  return dots.reduce((sum, dot) => sum + (lineAt(line, dot.x) - dot.y) ** 2, 0) / dots.length;
}

/** The best line for some dots, worked out in one go. */
export function bestLine(dots: readonly Dot[]) {
  if (dots.length < 2) return null;
  const [height = 0, slope = 0] = fitCurve(dots, 1);
  return handlesOf({ slope, height });
}

export const keyOf = (state: LineState) =>
  `${state.line.left},${state.line.right}|${state.spread}|${state.dots}|${state.added
    .map(({ x, y }) => `${x},${y}`)
    .join(";")}`;

/** Every moment of the walk from the learner's line downhill to the best one. */
export function* walkRun(state: LineState): Generator<LineFrame> {
  const dots = allDots(state);
  const key = keyOf(state);
  let { slope, height } = slopeOf(state.line);
  const frame = (epoch: number): LineFrame => {
    const line = handlesOf({ slope, height });
    return {
      epoch,
      key,
      steps: STEPS,
      left: round3(line.left),
      right: round3(line.right),
      loss: meanMiss(dots, line),
    };
  };
  yield frame(0);
  for (let epoch = 1; epoch <= STEPS; epoch += 1) {
    let dSlope = 0;
    let dHeight = 0;
    for (const dot of dots) {
      const miss = height + slope * dot.x - dot.y;
      dSlope += (2 * miss * dot.x) / dots.length;
      dHeight += (2 * miss) / dots.length;
    }
    slope -= RATE * dSlope;
    height -= RATE * dHeight;
    if (epoch % EVERY === 0 || epoch === STEPS) yield frame(epoch);
  }
}

/** True when `frame` is the end of the walk for the dots and line on screen now. */
export const isFinished = (state: LineState, frame: LineFrame | undefined): frame is LineFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.steps;

/** True when `frame` belongs to the walk for the dots and line on screen now. */
export const isThisWalk = (state: LineState, frame: LineFrame | undefined): frame is LineFrame =>
  frame !== undefined && state.runs > 0 && frame.key === keyOf(state);

/** The added dots far from the line through the lesson's own dots. */
export function crazyDots(state: LineState): Dot[] {
  const base = bestLine(baseDots(state));
  if (!base) return [];
  return state.added.filter((dot) => Math.abs(lineAt(base, dot.x) - dot.y) >= CRAZY);
}

/** How much the best line's slope moved because of the learner's dots, and how far its handles went. */
export function moveFromAdded(state: LineState, frame: LineFrame) {
  const base = bestLine(baseDots(state));
  if (!base) return { tilt: 0, moved: 0 };
  return {
    tilt: Math.abs(slopeOf(frame).slope - slopeOf(base).slope),
    moved: Math.max(Math.abs(frame.left - base.left), Math.abs(frame.right - base.right)),
  };
}
