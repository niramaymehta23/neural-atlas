/**
 * Memorising vs understanding: a student (a network with one input and one layer of smooth
 * cells) practises on a few past papers, points from a gentle wave with some noise, and then
 * sits a new exam of fresh points from the same wave. A run is worked out whole from state, so a
 * shared link replays it exactly.
 */
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

export type Spot = { x: number; y: number };

export type StudyState = {
  /** How many cells the student can memorise with. */
  cells: number;
  /** How many past papers (practice points) it studies. */
  questions: number;
  /** Practice sessions asked for so far; 0 until the first. A link replays the last one. */
  runs: number;
};

export type StudyFrame = TimelineFrame & {
  /** The settings this run was worked out for. */
  key: string;
  /** Mistakes on the new exam (the practice mistakes are `loss`). */
  exam: number;
  params: number[];
  rounds: number;
};

export const LIMITS = { cells: { min: 1, max: 24 }, questions: { min: 4, max: 20 } };
export const ROUNDS = 600;
const EVERY = 10;
const EXAM_SIZE = 40;
const NOISE = 0.25;
const RATE = 0.05;
/** Wild starting weights let each cell bend sharply, so a big team can memorise every point. */
const START_SCALE = 6;
const SEED = { papers: 3, exam: 77, start: 2 };

/** Mistakes smaller than this are tiny: the answers are learned by heart. */
export const ACED = 0.01;
/** Exam mistakes bigger than this mean the student failed the new exam. */
export const FAILED = 0.15;

export const wave = (x: number) => 0.6 * Math.sin(2.2 * x);

const round = (value: number) => Math.round(value * 1000) / 1000;

function sample(count: number, seed: number): Spot[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => {
    const x = random.range(-1, 1);
    return { x: round(x), y: round(wave(x) + random.normal() * NOISE) };
  });
}

/** The past papers: the first `questions` of one fixed pile, so more questions adds to it. */
export const papersFor = (questions: number) =>
  sample(LIMITS.questions.max, SEED.papers).slice(0, questions);
export const EXAM = sample(EXAM_SIZE, SEED.exam);

export const specFor = (cells: number): DenseSpec => ({
  sizes: [1, cells, 1],
  bends: ["tanh"],
  loss: "squared",
});

const dataOf = (spots: readonly Spot[]): DenseData => ({
  inputs: spots.map(({ x }) => x),
  targets: spots.map(({ y }) => y),
});

export const keyOf = ({ cells, questions }: Pick<StudyState, "cells" | "questions">) =>
  `${cells}|${questions}`;

/** Every moment of the practice `state` describes, the untaught student first. */
export function* studyRun(state: StudyState): Generator<StudyFrame> {
  const spec = specFor(state.cells);
  const practice = dataOf(papersFor(state.questions));
  const exam = dataOf(EXAM);
  const trainer = createTrainer(
    spec,
    startParams(spec.sizes, { seed: SEED.start, scale: START_SCALE }),
    practice,
    { optimiser: "adam", learningRate: RATE, seed: SEED.start },
  );
  const key = keyOf(state);
  const frame = (epoch: number): StudyFrame => ({
    epoch,
    key,
    loss: meanLoss(spec, trainer.params, practice),
    exam: meanLoss(spec, trainer.params, exam),
    params: Array.from(trainer.params),
    rounds: ROUNDS,
  });
  yield frame(0);
  for (let epoch = 1; epoch <= ROUNDS; epoch += 1) {
    trainer.round();
    if (epoch % EVERY === 0) yield frame(epoch);
  }
}

/** True when `frame` ends the practice for the settings `state` holds now. */
export const isFinished = (state: StudyState, frame: StudyFrame | undefined): frame is StudyFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === frame.rounds;

/** The student's answer at many spots across the page, for drawing its curve. */
export function curveOf(cells: number, params: ArrayLike<number>, spots = 81): Spot[] {
  const xs = Array.from({ length: spots }, (_, index) => -1 + (2 * index) / (spots - 1));
  const ys = predict(specFor(cells), params, xs);
  return xs.map((x, index) => ({ x, y: ys[index] ?? 0 }));
}

export type Size = "tiny" | "small" | "big" | "huge";
/** A mistake score in words. */
export const sizeOf = (mistake: number): Size =>
  mistake < 0.02 ? "tiny" : mistake < 0.08 ? "small" : mistake < 0.2 ? "big" : "huge";

export type Outcome = "better" | "same" | "worse";
/** How the exam went compared with the practice, at the end of a run. */
export function examVersusPractice(frame: StudyFrame): Outcome {
  if (frame.exam < frame.loss) return "better";
  return frame.exam > 2 * frame.loss + 0.03 ? "worse" : "same";
}
