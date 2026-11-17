/**
 * Passing back the blame: a stack of small layers learns to sort dots into two kinds. After each
 * round the mistake is passed back through the stack, layer by layer, and each layer gets its
 * share of the blame. With S-shaped cells the share shrinks at every layer it passes, so in a
 * deep stack almost none reaches the start.
 */
import { makeDataset } from "@/data/datasets";
import {
  createTrainer,
  startParams,
  type DenseData,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import { rainShares } from "@/features/building/GradientRain";
import type { TimelineFrame } from "@/platform/contract";

export const BENDS = ["sigmoid", "leakyRelu"] as const;
export type Bend = (typeof BENDS)[number];

export type BlameState = {
  /** Hidden layers of three cells. */
  layers: number;
  bend: Bend;
  /** "How big a step", 0–1 on the dial. */
  step: number;
  /** Practice runs asked for; 0 until the first. */
  runs: number;
};

export type BlameFrame = TimelineFrame & {
  key: string;
  rounds: number;
  /** Per layer of threads, input side first: how much blame reached it this round. */
  blame: number[];
};

export const LAYERS = { min: 1, max: 8 };
export const CELLS = 3;
export const ROUNDS = 120;
const EVERY = 2;
const STEP_RANGE = { min: 0.01, max: 1.5 };
const SEED = 6;

export const stepSize = (dial: number) => STEP_RANGE.min + dial * (STEP_RANGE.max - STEP_RANGE.min);

export const specOf = ({ layers, bend }: Pick<BlameState, "layers" | "bend">): DenseSpec => ({
  sizes: [2, ...Array.from({ length: layers }, () => CELLS), 1],
  bends: [bend],
  loss: "logistic",
});

const DATA: DenseData = (() => {
  const points = makeDataset("blobs", { count: 60, noise: 0.25, seed: 2 });
  return {
    inputs: points.flatMap(({ x, y }) => [x, y]),
    targets: points.map(({ label }) => label),
  };
})();

export const keyOf = ({ layers, bend, step }: BlameState) => `${layers}|${bend}|${step}`;

/** Every moment of the run `state` describes: the mistake and the blame each layer got. */
export function* blameRun(state: BlameState): Generator<BlameFrame> {
  const key = keyOf(state);
  const spec = specOf(state);
  const trainer = createTrainer(spec, startParams(spec.sizes, { seed: SEED }), DATA, {
    optimiser: "sgd",
    learningRate: stepSize(state.step),
    seed: SEED,
  });
  for (let epoch = 0; epoch <= ROUNDS; epoch += 1) {
    // Each report is the mistake before that round and the blame passed back during it.
    const { loss, blame } = trainer.round();
    if (epoch % EVERY === 0 || epoch === ROUNDS)
      yield {
        epoch,
        key,
        rounds: ROUNDS,
        loss: Number.isFinite(loss) ? loss : 1e6,
        blame: blame.map((value) => (Number.isFinite(value) ? value : 0)),
      };
  }
}

export const isFinished = (state: BlameState, frame: BlameFrame | undefined): frame is BlameFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** The share of the blame that reaches the very first layer. */
export const startShare = (frame: Pick<BlameFrame, "blame">) => rainShares(frame.blame)[0] ?? 0;
