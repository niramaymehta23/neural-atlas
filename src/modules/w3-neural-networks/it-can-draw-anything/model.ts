/**
 * It can draw anything: one row of smooth cells copies a squiggle the learner draws. A few cells can
 * only make a few bends; enough cells can follow any squiggle, given enough practice.
 */
import {
  createTrainer,
  meanLoss,
  predict,
  startParams,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import type { TimelineFrame } from "@/platform/contract";

export type DrawState = {
  /** The squiggle: one height (−1 to 1) per column, left to right. */
  heights: number[];
  /** "How many cells", a whole number. */
  cells: number;
  /** "How long it practises", 0–1 on the dial. */
  practice: number;
  /** Practice runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type DrawFrame = TimelineFrame & { key: string; rounds: number; params: number[] };

export const COLUMNS = 32;
export const CELLS = { min: 1, max: 20 };
const ROUNDS = { min: 100, max: 3000 };
const MOMENTS = 60;
const SEED = 7;
const LEARNING_RATE = 0.06;
/** Mistakes this small or smaller: the line follows the squiggle. */
export const CLOSE = 0.005;
/** Mistakes this big or bigger: the line is still far off. */
export const FAR = 0.03;

/** Where each column sits across the line, −1 to 1. */
export const XS = Array.from({ length: COLUMNS }, (_, index) => -1 + (2 * index) / (COLUMNS - 1));

const round2 = (value: number) => Math.round(value * 100) / 100;
const shaped = (shape: (x: number) => number) => XS.map((x) => round2(shape(x)));

/** Ready squiggles, for anyone who would rather not draw. */
export const READY = {
  wave: shaped((x) => 0.7 * Math.sin(2 * Math.PI * x)),
  zigzag: shaped((x) => {
    const phase = ((((x + 1) * 2.5) % 1) + 1) % 1;
    return 0.7 * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase);
  }),
  steps: shaped((x) => (x < -0.5 ? -0.6 : x < 0 ? 0.2 : x < 0.5 ? -0.2 : 0.6)),
} satisfies Record<string, number[]>;
export type Ready = keyof typeof READY;
export const READY_NAMES = Object.keys(READY) as Ready[];

export const roundsOf = (practice: number) =>
  Math.round(ROUNDS.min + (ROUNDS.max - ROUNDS.min) * Math.min(1, Math.max(0, practice)));

export const specOf = (cells: number): DenseSpec => ({
  sizes: [1, cells, 1],
  bends: ["tanh"],
  loss: "squared",
});

export const keyOf = ({ heights, cells, practice }: DrawState) =>
  `${heights.join(",")}|${cells}|${practice}`;

/** The same heights as a ready squiggle. */
export const isReady = (heights: readonly number[], ready: Ready) =>
  heights.length === COLUMNS && heights.every((value, index) => value === READY[ready][index]);

/** The line the cells draw at every column. */
export const lineOf = (cells: number, params: ArrayLike<number>) =>
  Array.from(predict(specOf(cells), params, XS));

/** Every moment of the practice run `state` describes, the untrained cells first. */
export function* drawRun(state: DrawState): Generator<DrawFrame> {
  const key = keyOf(state);
  const spec = specOf(state.cells);
  const data = { inputs: XS, targets: state.heights };
  const rounds = roundsOf(state.practice);
  const trainer = createTrainer(spec, startParams(spec.sizes, { seed: SEED, scale: 2 }), data, {
    optimiser: "adam",
    learningRate: LEARNING_RATE,
    seed: SEED,
  });
  const every = Math.ceil(rounds / MOMENTS);
  const frame = (epoch: number): DrawFrame => {
    const loss = meanLoss(spec, trainer.params, data);
    return {
      epoch,
      key,
      loss: Number.isFinite(loss) ? loss : 1e6,
      rounds,
      params: Array.from(trainer.params, (value) => (Number.isFinite(value) ? value : 0)),
    };
  };
  yield frame(0);
  for (let epoch = 1; epoch <= rounds; epoch += 1) {
    trainer.round();
    if (epoch % every === 0 || epoch === rounds) yield frame(epoch);
  }
}

export const isFinished = (state: DrawState, frame: DrawFrame | undefined): frame is DrawFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;
