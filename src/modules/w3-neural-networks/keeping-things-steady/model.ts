/**
 * Keeping things steady: a deep stack of small layers learns to sort two kinds of dots. Without
 * calming, each layer passes on signals a little smaller (or a little wilder) than it got, so
 * deep in the stack they fade to nothing (or pile up at the ends), the blame passed back dries
 * up, and practice stalls. Calming re-centres and re-sizes every layer's signals before passing
 * them on, so even a very deep stack can learn. Pure: the same state always gives the same run.
 */
import { makeDataset } from "@/data/datasets";
import {
  createTrainer,
  hiddenOutputs,
  startParams,
  type DenseData,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import type { TimelineFrame } from "@/platform/contract";

export type SteadyState = {
  /** Hidden layers. */
  layers: number;
  /** "How wild the starting signals are", 0–1 on the dial. */
  wild: number;
  /** Keep signals calm: every hidden layer's signals are re-centred and re-sized. */
  calm: boolean;
  /** Practice runs asked for; 0 until the first. */
  runs: number;
};

export type SteadyFrame = TimelineFrame & {
  key: string;
  rounds: number;
  /** Per layer of connections, input side first: how much blame reached it this round. */
  blame: number[];
  params: number[];
};

export const LAYERS = { min: 2, max: 12 };
/** A stack at least this deep is very deep. */
export const DEEP = 8;
export const CELLS = 6;
export const ROUNDS = 120;
const EVERY = 2;
const RATE = 0.1;
const SEED = 4;
/** A mistake this big is hardly better than guessing (pure guessing scores about 0.69). */
export const STALLED = 0.6;
/** The last layer's signals this much smaller than the first's have faded. */
const FADED = 0.25;
/** This share of the last layer's signals pinned at the ends: blown up. */
const BLOWN = 0.5;

/** How far the starting signals spread: 0.3 at the bottom of the dial, 3 at the top. */
export const scaleFor = (wild: number) => 0.3 * 10 ** wild;

export const specOf = ({ layers, calm }: Pick<SteadyState, "layers" | "calm">): DenseSpec => ({
  sizes: [2, ...Array.from({ length: layers }, () => CELLS), 1],
  bends: ["tanh"],
  loss: "logistic",
  calm,
});

export const DATA: DenseData = (() => {
  const points = makeDataset("blobs", { count: 60, noise: 0.25, seed: 2 });
  return {
    inputs: points.flatMap(({ x, y }) => [x, y]),
    targets: points.map(({ label }) => label),
  };
})();

export const keyOf = ({ layers, wild, calm }: Pick<SteadyState, "layers" | "wild" | "calm">) =>
  `${layers}|${wild}|${calm}`;

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Every moment of the run `state` describes: the mistake, the blame and the network. */
export function* steadyRun(state: SteadyState): Generator<SteadyFrame> {
  const key = keyOf(state);
  const spec = specOf(state);
  const trainer = createTrainer(
    spec,
    startParams(spec.sizes, { seed: SEED, scale: scaleFor(state.wild) }),
    DATA,
    { optimiser: "sgd", learningRate: RATE, seed: SEED },
  );
  for (let epoch = 0; epoch <= ROUNDS; epoch += 1) {
    const params = Array.from(trainer.params, round);
    // Each report is the mistake before that round and the blame passed back during it.
    const { loss, blame } = trainer.round();
    if (epoch % EVERY === 0 || epoch === ROUNDS)
      yield {
        epoch,
        key,
        rounds: ROUNDS,
        loss: Number.isFinite(loss) ? loss : 1e6,
        blame: blame.map((value) => (Number.isFinite(value) ? value : 0)),
        params,
      };
  }
}

export function steadyEnd(state: SteadyState): SteadyFrame {
  let last: SteadyFrame | undefined;
  for (const frame of steadyRun(state)) last = frame;
  return last as SteadyFrame;
}

export const isFinished = (
  state: SteadyState,
  frame: SteadyFrame | undefined,
): frame is SteadyFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** What every hidden layer's cells say for every dot, for the strip. */
export const signalsOf = (state: Pick<SteadyState, "layers" | "calm">, params: ArrayLike<number>) =>
  hiddenOutputs(specOf(state), params, DATA.inputs);

const spread = (values: ArrayLike<number>) => {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) total += (values[index] ?? 0) ** 2;
  return Math.sqrt(total / Math.max(1, values.length));
};

const pinned = (values: ArrayLike<number>) => {
  let ends = 0;
  for (let index = 0; index < values.length; index += 1)
    if (Math.abs(values[index] ?? 0) > 0.95) ends += 1;
  return ends / Math.max(1, values.length);
};

export type Signals = "faded" | "blown" | "lively";

/** How the signals look by the last layer, compared with the first. */
export function signalsAtEnd(
  state: Pick<SteadyState, "layers" | "calm">,
  params: ArrayLike<number>,
): Signals {
  const layers = signalsOf(state, params);
  const first = layers[0] ?? [];
  const last = layers.at(-1) ?? [];
  if (spread(last) < FADED * spread(first)) return "faded";
  if (pinned(last) >= BLOWN) return "blown";
  return "lively";
}

/** A very deep stack without calming whose finished run is still close to guessing. */
export const stalled = (state: SteadyState, frame: SteadyFrame) =>
  state.layers >= DEEP && !state.calm && frame.loss >= STALLED;

/** Below this the stack has learned well. */
const LEARNED = 0.3;
export type Outcome = "learned" | "slow" | "stalled";
/** How a finished run went, from its last mistake. */
export const outcomeOf = (frame: Pick<SteadyFrame, "loss">): Outcome =>
  frame.loss >= STALLED ? "stalled" : frame.loss < LEARNED ? "learned" : "slow";
