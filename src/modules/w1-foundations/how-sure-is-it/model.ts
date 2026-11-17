/**
 * How sure is it? A straight fence learned from two groups of dots that overlap, which gives each
 * dot a chance of being the second kind. "How sure it lets itself be" scales its scores before
 * they become chances: a cautious fence keeps every chance near fifty-fifty, a boastful one pushes
 * them to "certain", right or wrong. Everything is worked out from state (the fence is the same
 * every time for the same overlap), so a link shows the same view.
 */
import { makeDataset, type Point } from "@/data/datasets";
import {
  chance,
  createTrainer,
  predict,
  startParams,
  type DenseSpec,
} from "@/engine/autodiff/dense";

export type Spot = { x: number; y: number };

export type SureState = {
  /** "How sure it lets itself be", 0–1 on the dial: cautious to boastful. */
  boast: number;
  /** "How much the groups overlap", 0–1 on the dial. */
  overlap: number;
  lens: Spot;
  /** The magnifying glass has been moved at least once. */
  looked: boolean;
};

export const SPEC: DenseSpec = { sizes: [2, 1], bends: [], loss: "logistic" };
const COUNT = 60;
const ROUNDS = 300;
const RATE = 0.1;
const NOISE = { min: 0.05, max: 0.5 };
/** Boasting scales the scores by 2^(−2 … 3): a quarter to eight times. */
const SCALE_POWER = { min: -2, max: 3 };
export const DEFAULT_BOAST = 0.4;
/** A wrong guess at least this sure counts as "100% sure and wrong". */
export const CERTAIN = 0.99;
/** A guess less sure than this (as `sureness`) counts as unsure. */
export const UNSURE = 0.6;
export const PICKS = 5;

const round = (value: number) => Math.round(value * 1000) / 1000;

export const scaleFor = (boast: number) =>
  2 ** (SCALE_POWER.min + boast * (SCALE_POWER.max - SCALE_POWER.min));

export function dotsFor(overlap: number): Point[] {
  const noise = NOISE.min + overlap * (NOISE.max - NOISE.min);
  return makeDataset("blobs", { count: COUNT, noise, seed: 8 }).map(({ x, y, label }) => ({
    x: round(x),
    y: round(y),
    label,
  }));
}

const fences = new Map<number, Float64Array>();
/** The fence learned from the dots for this overlap (worked out once, then remembered). */
export function fenceFor(overlap: number): Float64Array {
  const known = fences.get(overlap);
  if (known) return known;
  const dots = dotsFor(overlap);
  const trainer = createTrainer(
    SPEC,
    startParams(SPEC.sizes, { seed: 4 }),
    { inputs: dots.flatMap(({ x, y }) => [x, y]), targets: dots.map(({ label }) => label) },
    { optimiser: "adam", learningRate: RATE, seed: 4 },
  );
  for (let round = 0; round < ROUNDS; round += 1) trainer.round();
  // A dial can rest on many values; keep only the recent ones.
  if (fences.size >= 64) fences.clear();
  fences.set(overlap, trainer.params);
  return trainer.params;
}

/** Each input's chance of being the second kind, with the scores scaled by boasting. */
export function chancesAt(state: Pick<SureState, "boast" | "overlap">, inputs: ArrayLike<number>) {
  const scale = scaleFor(state.boast);
  return Float64Array.from(predict(SPEC, fenceFor(state.overlap), inputs), (score) =>
    chance(score * scale),
  );
}

export const dotChances = (state: Pick<SureState, "boast" | "overlap">) =>
  chancesAt(
    state,
    dotsFor(state.overlap).flatMap(({ x, y }) => [x, y]),
  );

/** How sure a chance is, from 0 (fifty-fifty) to 1 (certain either way). */
export const sureness = (value: number) => Math.min(1, Math.abs(2 * value - 1));

export type Guess = {
  index: number;
  /** The group it guesses. */
  says: number;
  /** How sure of that guess, as a chance 0.5–1. */
  sure: number;
  right: boolean;
};

export function guessOf(dot: Point, value: number, index: number): Guess {
  const says = value > 0.5 ? 1 : 0;
  return { index, says, sure: Math.max(value, 1 - value), right: says === dot.label };
}

/** Five dots worth looking at: from the one nearest the fence to the one furthest from it. */
export function picksFor(overlap: number): number[] {
  const dots = dotsFor(overlap);
  const scores = predict(
    SPEC,
    fenceFor(overlap),
    dots.flatMap(({ x, y }) => [x, y]),
  );
  const order = dots
    .map((_, index) => index)
    .sort((a, b) => Math.abs(scores[a] ?? 0) - Math.abs(scores[b] ?? 0) || a - b);
  return Array.from(
    { length: PICKS },
    (_, pick) => order[Math.round((pick / (PICKS - 1)) * (order.length - 1))] ?? 0,
  );
}

/** True when some dot gets a wrong guess it is all but certain of. */
export function sureAndWrong(state: Pick<SureState, "boast" | "overlap">): boolean {
  const dots = dotsFor(state.overlap);
  const chances = dotChances(state);
  return dots.some((dot, index) => {
    const guess = guessOf(dot, chances[index] ?? 0.5, index);
    return !guess.right && guess.sure >= CERTAIN;
  });
}

/** How sure the fence is, at the usual boasting, about the dot nearest the border. */
export function borderSureness(overlap: number): number {
  const [nearest = 0] = picksFor(overlap);
  const chances = dotChances({ boast: DEFAULT_BOAST, overlap });
  return sureness(chances[nearest] ?? 0.5);
}
