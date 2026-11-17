/**
 * Don't cram: a big team of cells practises on a few noisy dots and is then tested on new dots
 * from the same picture. Switching a share of the cells off at random while it practises (each
 * example, a fresh share) stops any one cell from memorising a dot, so the team has to learn the
 * broad picture. Switch too many off and it learns nothing at all. Pure: the same state always
 * gives the same run.
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

export type CramState = {
  /** "How many cells switch off while it learns", 0–1 on the dial (a share of the team). */
  off: number;
  /** "How big the team is": hidden cells. */
  team: number;
  /** Practice runs asked for so far; 0 until the first. */
  runs: number;
};

export type CramFrame = TimelineFrame & {
  key: string;
  params: number[];
  /** Practice dots on the right side now. */
  practice: number;
  /** New dots on the right side now. */
  fresh: number;
  rounds: number;
};

export const TEAM = { min: 4, max: 32 };
/** The dial's top: at most this share of the cells is off at once. */
export const MOST_OFF = 0.95;
export const ROUNDS = 300;
const EVERY = 5;
const RATE = 0.05;
const SCALE = 4;
const SEED = { practice: 21, fresh: 22, start: 23 };
/** A practice mistake this big is hardly better than guessing (pure guessing scores about 0.69). */
export const GUESSING_MISTAKE = 0.6;
/** New dots scored at or below this share right: no better than guessing. */
export const GUESSING = 0.6;
/** The guess compares these two runs at the lesson's own settings, whatever the dials say. */
export const FIXED = { team: 16, without: 0, with: 0.4 };

const round = (value: number) => Math.round(value * 1000) / 1000;
const sample = (count: number, seed: number): Point[] =>
  makeDataset("xor", { count, noise: 0.45, seed }).map(({ x, y, label }) => ({
    x: round(x),
    y: round(y),
    label,
  }));

export const PRACTICE = sample(20, SEED.practice);
export const FRESH = sample(100, SEED.fresh);
const dataOf = (points: readonly Point[]): DenseData => ({
  inputs: points.flatMap(({ x, y }) => [x, y]),
  targets: points.map(({ label }) => label),
});
const PRACTICE_DATA = dataOf(PRACTICE);
const FRESH_DATA = dataOf(FRESH);

export const specFor = (team: number, off = 0): DenseSpec => ({
  sizes: [2, team, 1],
  bends: ["tanh"],
  loss: "logistic",
  dropout: off,
});

export const keyOf = ({ off, team }: Pick<CramState, "off" | "team">) => `${off}|${team}`;

/** How many of `points` the network puts on the right side. */
function rightCount(
  team: number,
  params: ArrayLike<number>,
  points: readonly Point[],
  data: DenseData,
) {
  const scores = predict(specFor(team), params, data.inputs);
  return points.reduce(
    (right, { label }, index) => right + Number((scores[index] ?? 0) > 0 === (label === 1)),
    0,
  );
}

/** Every moment of the practice `state` describes, the untaught team first. */
export function* cramRun(state: Pick<CramState, "off" | "team">): Generator<CramFrame> {
  const spec = specFor(state.team, state.off * MOST_OFF);
  const key = keyOf(state);
  const trainer = createTrainer(
    spec,
    startParams(spec.sizes, { seed: SEED.start, scale: SCALE }),
    PRACTICE_DATA,
    { optimiser: "adam", learningRate: RATE, seed: SEED.start },
  );
  const frame = (epoch: number): CramFrame => ({
    epoch,
    key,
    loss: meanLoss(spec, trainer.params, PRACTICE_DATA),
    params: Array.from(trainer.params, round),
    practice: rightCount(state.team, trainer.params, PRACTICE, PRACTICE_DATA),
    fresh: rightCount(state.team, trainer.params, FRESH, FRESH_DATA),
    rounds: ROUNDS,
  });
  yield frame(0);
  for (let epoch = 1; epoch <= ROUNDS; epoch += 1) {
    trainer.round();
    if (epoch % EVERY === 0) yield frame(epoch);
  }
}

export function cramEnd(state: Pick<CramState, "off" | "team">): CramFrame {
  let last: CramFrame | undefined;
  for (const frame of cramRun(state)) last = frame;
  return last as CramFrame;
}

export const isFinished = (state: CramState, frame: CramFrame | undefined): frame is CramFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

export const practiceShare = (frame: CramFrame) => frame.practice / PRACTICE.length;
export const freshShare = (frame: CramFrame) => frame.fresh / FRESH.length;

/** Too many off: no better than guessing, on the practice dots and on the new ones. */
export const learnedNothing = (frame: CramFrame) =>
  frame.loss >= GUESSING_MISTAKE && freshShare(frame) <= GUESSING;

let fixed: boolean | undefined;
/** True when switching some cells off does better on new dots, in the fixed comparison. */
export function switchingHelps(): boolean {
  fixed ??=
    cramEnd({ team: FIXED.team, off: FIXED.with }).fresh >
    cramEnd({ team: FIXED.team, off: FIXED.without }).fresh;
  return fixed;
}

/**
 * One moment's switched-off cells, for the picture: each cell is off with the dial's chance.
 * (The real practice draws a fresh set for every example.)
 */
export function offCells(state: Pick<CramState, "off" | "team">, epoch: number): boolean[] {
  const random = createRandom(SEED.start * 1000 + epoch);
  return Array.from({ length: state.team }, () => random.next() < state.off * MOST_OFF);
}
