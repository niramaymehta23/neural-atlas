/**
 * Break and repair: a team of cells that has learned a garden, some of whose threads are cut, and
 * which then practises again with only a few chosen cells free to change. A cut thread stays cut.
 */
import {
  createTrainer,
  gradient,
  paramCount,
  startParams,
  type DenseSpec,
} from "../autodiff/dense";
import { fieldOf } from "../ml/field";
import type { Dot } from "../ml/types";
import { counting } from "../multiplications";
import type { PracticeRun } from "../practice/protocol";
import { judge } from "./field";
import { networkClassifier } from "./garden-run";

export const MEND_SIZES = [2, 8, 1] as const;
const HIDDEN = MEND_SIZES[1];
/** Rounds the whole team practised before anything was cut. */
const LEARNED_ROUNDS = 150;
/** Rounds each chosen cell practises for. */
export const MEND_ROUNDS = 60;
/** A team mended to this share of the new dots is repaired. */
export const MEND_GOAL = 0.9;
const RATE = 0.05;

/** Threads by number: first the two into each cell, cell by cell, then each cell's way out. */
export const THREADS = HIDDEN * 3;

/** Where thread `thread` sits in the weights (each cell's two weights and its own start, then the last cell's). */
export function threadAt(thread: number): number {
  if (thread < HIDDEN * 2) return Math.floor(thread / 2) * 3 + (thread % 2);
  return HIDDEN * 3 + (thread - HIDDEN * 2);
}

/** The weights that belong to cell `cell`: the two in, its own start, and its way out. */
export const cellWeights = (cell: number): number[] => [
  cell * 3,
  cell * 3 + 1,
  cell * 3 + 2,
  HIDDEN * 3 + cell,
];

export type MendConfig = {
  kind: "mend";
  dots: readonly Dot[];
  fresh: readonly Dot[];
  spots: Float32Array;
  seed: number;
  /** Threads cut, by number. */
  cuts: readonly number[];
  /** Cells sent to practise, in order; each practises for `MEND_ROUNDS` steps. */
  cells: readonly number[];
};

export type MendMoment = {
  kind: "mend";
  step: number;
  right: number;
  off: number;
  field: Float32Array;
  params: Float64Array;
  times: number;
};

/** The team before anything is cut. */
export function learnedTeam(dots: readonly Dot[], seed: number): Float64Array {
  const params = startParams(MEND_SIZES, { seed });
  const trainer = createTrainer(SPEC, params, dataOf(dots), {
    optimiser: "adam",
    learningRate: 0.05,
    batchSize: 16,
    seed,
  });
  for (let round = 0; round < LEARNED_ROUNDS; round += 1) trainer.round();
  return params;
}

const SPEC: DenseSpec = { sizes: MEND_SIZES, bends: ["tanh"], loss: "logistic" };
const dataOf = (dots: readonly Dot[]) => ({
  inputs: dots.flatMap((dot) => [dot.x, dot.y]),
  targets: dots.map((dot) => dot.label),
});

export function createMendRun(config: MendConfig): PracticeRun<MendMoment> {
  if (config.dots.length === 0) throw new Error("A team needs dots to learn from.");
  const data = dataOf(config.dots);
  const params = learnedTeam(config.dots, config.seed);
  const cut = new Set(config.cuts.map(threadAt));
  for (const at of cut) params[at] = 0;
  const size = paramCount(MEND_SIZES);
  let first = new Float64Array(size);
  let second = new Float64Array(size);
  let step = 0;
  let times = 0;
  return {
    get step() {
      return step;
    },
    advance() {
      const turn = Math.floor(step / MEND_ROUNDS);
      const within = step % MEND_ROUNDS;
      step += 1;
      const cell = config.cells[turn];
      if (cell === undefined) return;
      if (within === 0) {
        first = new Float64Array(size);
        second = new Float64Array(size);
      }
      times += counting(() => {
        const grads = gradient(SPEC, params, data);
        for (const at of cellWeights(cell)) {
          if (cut.has(at)) continue;
          const grad = grads[at] ?? 0;
          const m = 0.9 * (first[at] ?? 0) + 0.1 * grad;
          const v = 0.999 * (second[at] ?? 0) + 0.001 * grad * grad;
          first[at] = m;
          second[at] = v;
          const mHat = m / (1 - 0.9 ** (within + 1));
          const vHat = v / (1 - 0.999 ** (within + 1));
          params[at] = (params[at] ?? 0) - (RATE * mHat) / (Math.sqrt(vHat) + 1e-8);
        }
      }).times;
    },
    moment() {
      const classify = networkClassifier(SPEC, params);
      return {
        kind: "mend",
        step,
        right: judge(classify, config.fresh).right,
        off: judge(classify, config.dots).off,
        field: fieldOf(classify, config.spots, 2),
        params: params.slice(),
        times,
      };
    },
    every: 1,
  };
}
