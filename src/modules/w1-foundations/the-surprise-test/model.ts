/**
 * The surprise test: some of the examples are hidden while a learner practises on the rest, then
 * used as a surprise test. Peeking at the hidden answers (practising on them too) makes that test
 * look better than the learner really is, which only brand-new examples show. A run is worked out
 * whole from state, so a shared link replays it exactly.
 */
import { makeDataset, type Point } from "@/data/datasets";
import {
  createTrainer,
  meanLoss,
  predict,
  startParams,
  type DenseData,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type SurpriseState = {
  /** "How much to hide", 0–1 on the dial. */
  hide: number;
  /** How many cells the learner has: how bendy its fences can be. */
  cells: number;
  /** Practise on the hidden examples too. */
  peek: boolean;
  /** The brand-new examples have been tried. */
  fresh: boolean;
  /** Practice sessions asked for so far; 0 until the first. A link replays the last one. */
  runs: number;
};

export type Score = { right: number; total: number };

export type SurpriseFrame = TimelineFrame & {
  key: string;
  params: number[];
  practice: Score;
  surprise: Score;
  fresh: Score;
  rounds: number;
};

export const LIMITS = { cells: { min: 1, max: 12 } };
const HIDE_RANGE = { min: 0.1, max: 0.5 };
const COUNT = 60;
const FRESH_COUNT = 200;
const NOISE = 0.45;
export const ROUNDS = 400;
const EVERY = 10;
const RATE = 0.05;
const START_SCALE = 4;
const SEED = { dots: 6, fresh: 99, shuffle: 13, start: 3 };

/** A surprise test this good looks like the learner has mastered it. */
export const LOOKS_GREAT = 0.9;
/** Brand-new examples this much worse than the surprise test show the score lied. */
export const LIED_BY = 0.1;

const round = (value: number) => Math.round(value * 1000) / 1000;
const plant = (count: number, seed: number) =>
  makeDataset("blobs", { count, noise: NOISE, seed }).map(({ x, y, label }) => ({
    x: round(x),
    y: round(y),
    label,
  }));

export const DOTS = plant(COUNT, SEED.dots);
export const FRESH = plant(FRESH_COUNT, SEED.fresh);

/** The order dots are hidden in: a fixed shuffle, so hiding more hides the same ones and more. */
const ORDER = (() => {
  const random = createRandom(SEED.shuffle);
  const order = DOTS.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = random.int(index + 1);
    [order[index], order[swap]] = [order[swap] as number, order[index] as number];
  }
  return order;
})();

export const hiddenCount = (hide: number) =>
  Math.round(COUNT * (HIDE_RANGE.min + hide * (HIDE_RANGE.max - HIDE_RANGE.min)));

/** Which dots are hidden for a "How much to hide" dial position. */
export function hiddenSet(hide: number): Set<number> {
  return new Set(ORDER.slice(0, hiddenCount(hide)));
}

export const specFor = (cells: number): DenseSpec => ({
  sizes: [2, cells, 1],
  bends: ["tanh"],
  loss: "logistic",
});

const dataOf = (points: readonly Point[]): DenseData => ({
  inputs: points.flatMap(({ x, y }) => [x, y]),
  targets: points.map(({ label }) => label),
});

export function scoreOf(spec: DenseSpec, params: ArrayLike<number>, points: readonly Point[]) {
  const scores = predict(spec, params, dataOf(points).inputs);
  const right = points.reduce(
    (sum, { label }, index) => sum + Number((scores[index] ?? 0) > 0 === (label === 1)),
    0,
  );
  return { right, total: points.length };
}

export const keyOf = ({ hide, cells, peek }: Pick<SurpriseState, "hide" | "cells" | "peek">) =>
  `${hide}|${cells}|${peek}`;

/** The dots it practises on and the dots kept for the surprise test. */
export function split(hide: number) {
  const hidden = hiddenSet(hide);
  return {
    seen: DOTS.filter((_, index) => !hidden.has(index)),
    hidden: DOTS.filter((_, index) => hidden.has(index)),
  };
}

/** Every moment of the practice `state` describes. */
export function* surpriseRun(state: SurpriseState): Generator<SurpriseFrame> {
  const spec = specFor(state.cells);
  const { seen, hidden } = split(state.hide);
  const practised = dataOf(state.peek ? DOTS : seen);
  const trainer = createTrainer(
    spec,
    startParams(spec.sizes, { seed: SEED.start, scale: START_SCALE }),
    practised,
    { optimiser: "adam", learningRate: RATE, seed: SEED.start },
  );
  const key = keyOf(state);
  const frame = (epoch: number): SurpriseFrame => ({
    epoch,
    key,
    loss: meanLoss(spec, trainer.params, practised),
    params: Array.from(trainer.params),
    practice: scoreOf(spec, trainer.params, seen),
    surprise: scoreOf(spec, trainer.params, hidden),
    fresh: scoreOf(spec, trainer.params, FRESH),
    rounds: ROUNDS,
  });
  yield frame(0);
  for (let epoch = 1; epoch <= ROUNDS; epoch += 1) {
    trainer.round();
    if (epoch % EVERY === 0) yield frame(epoch);
  }
}

export const share = ({ right, total }: Score) => (total > 0 ? right / total : 0);

export const isFinished = (
  state: SurpriseState,
  frame: SurpriseFrame | undefined,
): frame is SurpriseFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** True when the surprise test looks great but brand-new examples show it is not. */
export const scoreLied = (frame: SurpriseFrame) =>
  share(frame.surprise) >= LOOKS_GREAT && share(frame.fresh) <= share(frame.surprise) - LIED_BY;

/** Which score was closer to how it did on brand-new examples (the surprise test on a tie). */
export function closerScore(frame: SurpriseFrame): "practice" | "surprise" {
  const fresh = share(frame.fresh);
  return Math.abs(share(frame.practice) - fresh) < Math.abs(share(frame.surprise) - fresh)
    ? "practice"
    : "surprise";
}
