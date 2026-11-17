/**
 * Thinking forwards: a small network that already knows apples from bananas. The learner
 * describes a fruit with two dials and watches the numbers flow through it, one layer at a time.
 * The network is trained once, the same way every time, when the lesson loads.
 */
import { createRandom } from "@/engine/random";
import {
  chance,
  createTrainer,
  hiddenOutputs,
  predict,
  startParams,
  type DenseSpec,
} from "@/engine/autodiff/dense";
import type { TimelineFrame } from "@/platform/contract";

export type ForwardState = {
  /** "How round", 0–1 on the dial. */
  round: number;
  /** "How red", 0–1 on the dial. */
  red: number;
  /** How far the thought has travelled: 0 not started, LAYERS when the answer is out. */
  shown: number;
  /** How many times the learner pressed "Think". */
  thoughts: number;
};

export type ForwardFrame = TimelineFrame;

export const SPEC: DenseSpec = { sizes: [2, 3, 2, 1], bends: ["tanh"], loss: "logistic" };
/** Steps of the thought: hidden layer one, hidden layer two, the answer. */
export const LAYERS = SPEC.sizes.length - 1;
/** The dials reach this far out on each side; real fruit sits within ±1. */
export const REACH = 3;
/** Beyond this, no real fruit looks like that. */
export const NONSENSE = 1.6;
/** An answer at least this sure (90 out of 100 either way) counts as very sure. */
export const VERY_SURE = 0.9;

export const inputOf = (dial: number) => -REACH + 2 * REACH * dial;
export const dialOf = (input: number) => (input + REACH) / (2 * REACH);
export const inputs = ({ round, red }: Pick<ForwardState, "round" | "red">) => [
  inputOf(round),
  inputOf(red),
];

/** Apples are round and red (1), bananas long and yellow (0): 60 fruit, the same every time. */
function fruit() {
  const random = createRandom(21);
  const rows: number[] = [];
  const labels: number[] = [];
  for (let index = 0; index < 60; index += 1) {
    const apple = index % 2;
    const centre = apple ? 0.55 : -0.55;
    rows.push(centre + random.normal() * 0.25, centre + random.normal() * 0.25);
    labels.push(apple);
  }
  return { inputs: rows, targets: labels };
}

function trainOnce(): number[] {
  const trainer = createTrainer(SPEC, startParams(SPEC.sizes, { seed: 4 }), fruit(), {
    optimiser: "adam",
    learningRate: 0.05,
    seed: 4,
  });
  for (let round = 0; round < 300; round += 1) trainer.round();
  return Array.from(trainer.params);
}

/** The network's numbers, learned once when the lesson loads. */
export const PARAMS: readonly number[] = trainOnce();

/** What every cell says for one fruit: per layer (the inputs first), each cell's value. */
export function thought(state: Pick<ForwardState, "round" | "red">): number[][] {
  const given = inputs(state);
  const hidden = hiddenOutputs(SPEC, PARAMS, given).map((layer) => Array.from(layer));
  const answer = Array.from(predict(SPEC, PARAMS, given));
  return [given, ...hidden, answer];
}

/** The chance it gives of "apple". */
export const appleChance = (state: Pick<ForwardState, "round" | "red">) =>
  chance(predict(SPEC, PARAMS, inputs(state))[0] ?? 0);

/** How sure an answer is, 0 (fifty-fifty) to 1 (certain). */
export const sureness = (apple: number) => Math.abs(2 * apple - 1);

/** Nothing real is this round or this red, or this far the other way. */
export const isNonsense = (state: Pick<ForwardState, "round" | "red">) =>
  inputs(state).some((value) => Math.abs(value) > NONSENSE);

/** The thought has gone all the way through to an answer. */
export const answered = (state: ForwardState) => state.thoughts > 0 && state.shown >= LAYERS;
