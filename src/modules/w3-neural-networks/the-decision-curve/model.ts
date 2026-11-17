/**
 * The decision curve: one row of cells, each bending its total, copies a wavy line. With no bend
 * the cells can only add up to a straight line; with a bend they can draw curves. Cut-off cells
 * pushed too far say nothing for any input, and then they never learn again.
 */
import {
  createTrainer,
  hiddenOutputs,
  meanLoss,
  predict,
  startParams,
  type DenseData,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import type { Activation } from "@/engine/autodiff/nn";
import type { TimelineFrame } from "@/platform/contract";

export const BENDS = [
  "identity",
  "tanh",
  "relu",
  "leakyRelu",
] as const satisfies readonly Activation[];
export type Bend = (typeof BENDS)[number];

export const SHAPES = ["wave", "hill"] as const;
export type Shape = (typeof SHAPES)[number];

export type CurveState = {
  bend: Bend;
  shape: Shape;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** "How many cells", a whole number. */
  cells: number;
  /** Practice runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type CurveFrame = TimelineFrame & {
  key: string;
  params: number[];
  rounds: number;
  /** Cells that say nothing at all for any input. */
  silent: number;
};

export const CELLS = { min: 1, max: 12 };
export const ROUNDS = 300;
const MOMENTS = 60;
const STEP_RANGE = { min: 0.003, max: 0.6 };
const SEED = 3;
/** Inputs the cells are checked on, across the whole line. */
export const XS = Array.from({ length: 41 }, (_, index) => -1 + index / 20);
/** A copy whose mistakes are this small or smaller follows the wave. */
export const COPIED = 0.02;
/** At least this share of cells silent counts as "most cells". */
export const MOSTLY = 0.75;

const TARGETS: Record<Shape, (x: number) => number> = {
  wave: (x) => 0.8 * Math.sin(2.5 * Math.PI * x),
  hill: (x) => 1.4 * Math.exp(-6 * x * x) - 0.5,
};

/** Steps grow faster than the dial, so the top of the dial is really big. */
export const stepSize = (dial: number) =>
  STEP_RANGE.min * (STEP_RANGE.max / STEP_RANGE.min) ** Math.min(1, Math.max(0, dial));

export const specOf = ({ bend, cells }: Pick<CurveState, "bend" | "cells">): DenseSpec => ({
  sizes: [1, cells, 1],
  bends: [bend],
  loss: "squared",
});

export const targetAt = (shape: Shape, x: number) => TARGETS[shape](x);

/** The dots it copies: 24 across the line. */
export function dotsOf(shape: Shape) {
  return Array.from({ length: 24 }, (_, index) => {
    const x = -1 + (2 * index) / 23;
    return { x, y: Math.round(targetAt(shape, x) * 1000) / 1000 };
  });
}

const dataOf = (shape: Shape): DenseData => {
  const dots = dotsOf(shape);
  return { inputs: dots.map(({ x }) => x), targets: dots.map(({ y }) => y) };
};

export const keyOf = ({ bend, shape, step, cells }: CurveState) =>
  `${bend}|${shape}|${step}|${cells}`;

/** How many cells say nothing at all for any input. */
export function silentCells(state: Pick<CurveState, "bend" | "cells">, params: ArrayLike<number>) {
  const [layer] = hiddenOutputs(specOf(state), params, XS);
  if (!layer) return 0;
  let silent = 0;
  for (let cell = 0; cell < state.cells; cell += 1) {
    const says = layer.subarray(cell * XS.length, (cell + 1) * XS.length);
    if (says.every((value) => value === 0)) silent += 1;
  }
  return silent;
}

/** The network's line at many points across, for drawing. */
export const curveOf = (state: Pick<CurveState, "bend" | "cells">, params: ArrayLike<number>) =>
  Array.from(predict(specOf(state), params, XS));

/** What each cell says across the line, for the activation strip. */
export const cellAnswers = (state: Pick<CurveState, "bend" | "cells">, params: ArrayLike<number>) =>
  hiddenOutputs(specOf(state), params, XS);

/** Every moment of the practice run `state` describes, the untrained cells first. */
export function* curveRun(state: CurveState): Generator<CurveFrame> {
  const key = keyOf(state);
  const spec = specOf(state);
  const data = dataOf(state.shape);
  const trainer = createTrainer(spec, startParams(spec.sizes, { seed: SEED, scale: 2 }), data, {
    optimiser: "adam",
    learningRate: stepSize(state.step),
    seed: SEED,
  });
  const every = Math.ceil(ROUNDS / MOMENTS);
  const frame = (epoch: number): CurveFrame => {
    const loss = meanLoss(spec, trainer.params, data);
    return {
      epoch,
      key,
      // A run whose steps blew up counts as a very bad copy, not as no mistakes at all.
      loss: Number.isFinite(loss) ? loss : 1e6,
      params: Array.from(trainer.params, (value) => (Number.isFinite(value) ? value : 0)),
      rounds: ROUNDS,
      silent: silentCells(state, trainer.params),
    };
  };
  yield frame(0);
  for (let epoch = 1; epoch <= ROUNDS; epoch += 1) {
    trainer.round();
    if (epoch % every === 0 || epoch === ROUNDS) yield frame(epoch);
  }
}

export const isFinished = (state: CurveState, frame: CurveFrame | undefined): frame is CurveFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;
