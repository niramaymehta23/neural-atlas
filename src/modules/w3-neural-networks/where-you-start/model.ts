/**
 * Where you start: a small network (two inputs, a few hidden cells, one answer) learns to split
 * two kinds of dots that sit in opposite corners. Each spin of the roulette draws new starting guesses and practises to the
 * end, so the learner sees that where you start changes where you end. Starting every hidden
 * cell the same is the trap: they get the same blame each round, change the same way, and never
 * stop being copies. Pure: the same state always gives the same run.
 */
import { makeDataset, type Point } from "@/data/datasets";
import {
  createTrainer,
  hiddenOutputs,
  meanLoss,
  predict,
  startParams,
  type DenseData,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type StartState = {
  /** "How wild the starting guesses are", 0–1 on the dial. */
  wild: number;
  /** Hidden cells, 2–6. */
  cells: number;
  /** Every hidden cell starts with exactly the same guesses. */
  same: boolean;
  /** Spins so far; 0 until the first. Each spin draws new starting guesses. */
  spins: number;
};

export type StartFrame = TimelineFrame & {
  key: string;
  params: number[];
  /** Dots on the right side now. */
  right: number;
  rounds: number;
};

export const CELLS = { min: 2, max: 6 };
export const ROUNDS = 150;
const EVERY = 3;
const RATE = 0.05;
const SEED = 11;
/** The strip shows this many spins, the newest last. */
export const STRIP = 5;
/** Hidden cells whose answers differ by less than this everywhere are copies of each other. */
const COPIES = 1e-9;

export const DOTS: Point[] = makeDataset("xor", { count: 60, noise: 0.08, seed: 6 }).map(
  ({ x, y, label }) => ({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, label }),
);
const DATA: DenseData = {
  inputs: DOTS.flatMap(({ x, y }) => [x, y]),
  targets: DOTS.map(({ label }) => label),
};

export const specFor = (cells: number): DenseSpec => ({
  sizes: [2, cells, 1],
  bends: ["tanh"],
  loss: "logistic",
});

/** How far the starting guesses spread: tiny at the bottom of the dial, very wild at the top. */
export const scaleFor = (wild: number) => 0.05 + 6 * wild ** 2;

/** The settings a run depends on, as one string (each spin is a new run). */
export const keyOf = ({ wild, cells, same, spins }: StartState) =>
  `${wild}|${cells}|${same}|${spins}`;

/**
 * The starting guesses for one spin. "Same" gives every hidden cell the same two weights and
 * the answer cell the same weight from each of them, so nothing tells the cells apart.
 */
export function startFor({ wild, cells, same, spins }: StartState): Float64Array {
  const spec = specFor(cells);
  const seed = SEED + spins;
  if (!same) return startParams(spec.sizes, { seed, scale: scaleFor(wild) });
  const random = createRandom(seed);
  const spread = scaleFor(wild);
  const across = random.normal() * (spread / Math.SQRT2);
  const up = random.normal() * (spread / Math.SQRT2);
  const out = random.normal() * (spread / Math.sqrt(cells));
  const params = new Float64Array(cells * 3 + cells + 1);
  for (let cell = 0; cell < cells; cell += 1) params.set([across, up, 0], cell * 3);
  for (let cell = 0; cell < cells; cell += 1) params[cells * 3 + cell] = out;
  return params;
}

/** How many dots a network puts on the right side. */
export function rightCount(cells: number, params: ArrayLike<number>): number {
  const scores = predict(specFor(cells), params, DATA.inputs);
  return DOTS.reduce(
    (right, { label }, index) => right + Number((scores[index] ?? 0) > 0 === (label === 1)),
    0,
  );
}

/** Every moment of the spin `state` describes, the starting guesses first. */
export function* spinRun(state: StartState): Generator<StartFrame> {
  const spec = specFor(state.cells);
  const key = keyOf(state);
  const trainer = createTrainer(spec, startFor(state), DATA, {
    optimiser: "adam",
    learningRate: RATE,
    seed: SEED,
  });
  const frame = (epoch: number): StartFrame => ({
    epoch,
    key,
    loss: meanLoss(spec, trainer.params, DATA),
    params: Array.from(trainer.params),
    right: rightCount(state.cells, trainer.params),
    rounds: ROUNDS,
  });
  yield frame(0);
  for (let epoch = 1; epoch <= ROUNDS; epoch += 1) {
    trainer.round();
    if (epoch % EVERY === 0) yield frame(epoch);
  }
}

/** The end of a spin, without recording the moments between. */
export function spinEnd(state: StartState): StartFrame {
  let last: StartFrame | undefined;
  for (const frame of spinRun(state)) last = frame;
  return last as StartFrame;
}

export const isFinished = (state: StartState, frame: StartFrame | undefined): frame is StartFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** True when every hidden cell gives the same answer for every dot: they are copies. */
export function allCopies(cells: number, params: ArrayLike<number>): boolean {
  const [layer] = hiddenOutputs(specFor(cells), params, DATA.inputs);
  if (!layer) return false;
  const rows = DOTS.length;
  for (let cell = 1; cell < cells; cell += 1)
    for (let row = 0; row < rows; row += 1)
      if (Math.abs((layer[cell * rows + row] ?? 0) - (layer[row] ?? 0)) > COPIES) return false;
  return true;
}

/** The spins the strip shows: the last few, the newest last (none before the first spin). */
export const recentSpins = (spins: number) =>
  Array.from(
    { length: Math.min(STRIP, spins) },
    (_, index) => spins - Math.min(STRIP, spins) + 1 + index,
  );

/** How the last few spins ended, for the settings in a recorded spin's key (none before one). */
export function stripFor(key: string | undefined): { spins: number; right: number }[] {
  if (!key) return [];
  const [wild = "0", cells = "0", same = "false", spins = "0"] = key.split("|");
  return recentSpins(Number(spins)).map((spin) => ({
    spins: spin,
    right: spinEnd({ wild: Number(wild), cells: Number(cells), same: same === "true", spins: spin })
      .right,
  }));
}
