/**
 * Keeping score of mistakes: one line, two groups of dots (a big main group and a small group far
 * off), and a mistake-scorer whose strictness the learner turns. A gentle scorer counts a miss
 * as it is; a strict one counts big misses hugely (the miss raised to a power from one to four).
 * The line walks downhill on whichever score is chosen. Pure: the same state, the same walk.
 */
import { createOptimiser, type Param } from "@/engine/autodiff/optimisers";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type Dot = { x: number; y: number; rare: boolean };

export type ScoreState = {
  /** "How strict the scorer is", 0–1 on the dial: the power goes from one to four. */
  strict: number;
  /** "How many in the rare group", 0–1 on the dial: from none to RARE dots. */
  rare: number;
  /** Walks asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

/** One moment of the walk: the line then. */
export type ScoreFrame = TimelineFrame & {
  key: string;
  slope: number;
  height: number;
  steps: number;
};

export const RARE = 6;
const MAIN = 16;
const STEPS = 300;
const EVERY = 5;
const RATE = 0.03;
/** Keeps the gentle scorer smooth right at a miss of zero. */
const SMOOTH = 0.02;
/** Misses are measured in this unit (an everyday miss), so a far-off miss counts as several. */
const UNIT = 0.25;
/** A gentle scorer: the power no more than this. */
export const GENTLE_POWER = 1.4;
/** A strict scorer: the power at least this. */
export const STRICT_POWER = 2;
/** The line counts as through the main group when its dots miss by this little, on average. */
export const THROUGH_MAIN = 0.08;
/** ... and as ignoring the rare group when every rare dot misses by at least this much. */
export const IGNORES_RARE = 0.5;
const SEED = 17;

const unit = (value: number) => Math.min(1, Math.max(0, value));
export const power = (strict: number) => 1 + 3 * unit(strict);
export const rareCount = (rare: number) => Math.round(unit(rare) * RARE);

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** The main group along a gentle line, and the rare group bunched up far above it. */
export function dotsFor({ rare }: Pick<ScoreState, "rare">): Dot[] {
  const random = createRandom(SEED);
  const main = Array.from({ length: MAIN }, (_, index) => {
    const x = -0.9 + (1.8 * (index + random.next())) / MAIN;
    return { x: round3(x), y: round3(-0.25 + 0.3 * x + random.normal() * 0.04), rare: false };
  });
  const far = Array.from({ length: RARE }, () => ({
    x: round3(random.range(0.2, 0.85)),
    y: round3(random.range(0.75, 0.92)),
    rare: true,
  }));
  return [...main, ...far.slice(0, rareCount(rare))];
}

export type Line = { slope: number; height: number };

export const lineAt = ({ slope, height }: Line, x: number) => height + slope * x;

/** One dot's cost under a scorer of power `p`. */
export const cost = (miss: number, p: number) =>
  ((miss * miss + SMOOTH * SMOOTH) / (UNIT * UNIT)) ** (p / 2);

/** The slope of one dot's cost as its miss changes. */
const slopeOf = (miss: number, p: number) =>
  ((p * miss) / (UNIT * UNIT)) * ((miss * miss + SMOOTH * SMOOTH) / (UNIT * UNIT)) ** (p / 2 - 1);

/** How hard one dot pulls on the line: the size of its cost's slope. */
export const pull = (miss: number, p: number) => Math.abs(slopeOf(miss, p));

export const keyOf = ({ strict, rare }: Pick<ScoreState, "strict" | "rare">) =>
  `${power(strict).toFixed(3)}|${rareCount(rare)}`;

/** The line before any walk: flat across the middle. */
export const START = { slope: 0, height: 0 };

/** The line on screen: the walk's moment (even one for older dials, until the new walk), or the flat start. */
export const lineOf = (state: ScoreState, frame: ScoreFrame | undefined): Line =>
  state.runs > 0 && frame ? { slope: frame.slope, height: frame.height } : START;

/** Every moment of the walk from a flat line downhill on the chosen score. */
export function* scoreRun(state: ScoreState): Generator<ScoreFrame> {
  const dots = dotsFor(state);
  const p = power(state.strict);
  const key = keyOf(state);
  const params: [Param, Param] = [
    { data: START.slope, grad: 0 },
    { data: START.height, grad: 0 },
  ];
  const [slope, height] = params;
  const optimiser = createOptimiser({ kind: "adam", learningRate: RATE });
  const frame = (epoch: number): ScoreFrame => {
    const line = { slope: slope.data, height: height.data };
    return {
      epoch,
      key,
      steps: STEPS,
      slope: round3(line.slope),
      height: round3(line.height),
      loss: dots.reduce((sum, dot) => sum + cost(lineAt(line, dot.x) - dot.y, p), 0) / dots.length,
    };
  };
  yield frame(0);
  for (let epoch = 1; epoch <= STEPS; epoch += 1) {
    slope.grad = 0;
    height.grad = 0;
    for (const dot of dots) {
      const miss = height.data + slope.data * dot.x - dot.y;
      const slopeOfCost = slopeOf(miss, p) / dots.length;
      slope.grad += slopeOfCost * dot.x;
      height.grad += slopeOfCost;
    }
    optimiser.step(params);
    if (epoch % EVERY === 0 || epoch === STEPS) yield frame(epoch);
  }
}

export const isThisRun = (state: ScoreState, frame: ScoreFrame | undefined): frame is ScoreFrame =>
  state.runs > 0 && frame !== undefined && frame.key === keyOf(state);

export const isFinished = (state: ScoreState, frame: ScoreFrame | undefined): frame is ScoreFrame =>
  isThisRun(state, frame) && frame.epoch === frame.steps;

/** How far off the line is for each group, on average, and the rare group's smallest miss. */
export function groupMisses(state: ScoreState, line: Line) {
  const dots = dotsFor(state);
  const misses = (rare: boolean) =>
    dots.filter((dot) => dot.rare === rare).map((dot) => Math.abs(lineAt(line, dot.x) - dot.y));
  const main = misses(false);
  const far = misses(true);
  return {
    main: main.reduce((sum, miss) => sum + miss, 0) / (main.length || 1),
    rareClosest: far.length ? Math.min(...far) : 0,
  };
}

/** The line runs through the main group and leaves every rare dot far off. */
export function ignoresRare(state: ScoreState, line: Line) {
  if (rareCount(state.rare) === 0) return false;
  const { main, rareClosest } = groupMisses(state, line);
  return main <= THROUGH_MAIN && rareClosest >= IGNORES_RARE;
}

/** Which group pulls the line harder, dot for dot, at the end of a walk. */
export function hardestPull(state: ScoreState, line: Line) {
  const p = power(state.strict);
  const dots = dotsFor(state);
  const average = (rare: boolean) => {
    const group = dots.filter((dot) => dot.rare === rare);
    return (
      group.reduce((sum, dot) => sum + pull(lineAt(line, dot.x) - dot.y, p), 0) /
      (group.length || 1)
    );
  };
  return average(true) > average(false) ? ("far" as const) : ("near" as const);
}
