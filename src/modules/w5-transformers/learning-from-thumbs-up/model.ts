/**
 * Learning from picks: a three-number reward model (right, praising, agreeing) is fitted to the
 * learner's choices between pairs of answers, Bradley–Terry style, and the chatbot then gives the
 * answer its reward model scores highest.
 */
import type { TimelineFrame } from "@/platform/contract";
import { CHECKS, PRACTICE, type Answer } from "./captions";

export type ThumbsState = {
  /** For each choice so far: 0 picked the first answer of the pair, 1 the second. */
  picks: number[];
};

export type Weights = { correct: number; flatters: number; agrees: number };

export type ThumbsFrame = TimelineFrame & {
  picks: number[];
  weights: Weights;
  /** Which answer it now gives to each new question. */
  answers: number[];
  yesMan: boolean;
};

/** Every pair of answers to every practice question, in a fixed, mixed-up order. */
export const PAIRS = (() => {
  const all: { question: number; first: number; second: number }[] = [];
  const pairs = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ] as const;
  for (const [first, second] of pairs)
    PRACTICE.forEach((_, question) => all.push({ question, first, second }));
  // Swap sides on alternate pairs, so the better answer is not always in the same place.
  return all.map((pair, at) =>
    at % 2 === 0 ? pair : { ...pair, first: pair.second, second: pair.first },
  );
})();

export const MOST_PICKS = PAIRS.length;
/** What it had picked up from reading, before any thumbs-up. */
export const START: Weights = { correct: 0.5, flatters: 0, agrees: 0 };
const STEP = 0.6;
const FEATURES = ["correct", "flatters", "agrees"] as const;

const featuresOf = (answer: Answer) => FEATURES.map((feature) => (answer[feature] ? 1 : 0));
export const scoreOf = (weights: Weights, answer: Answer) =>
  FEATURES.reduce((sum, feature) => sum + (answer[feature] ? weights[feature] : 0), 0);

export function weightsOf(picks: readonly number[]): Weights {
  const weights = { ...START };
  picks.forEach((pick, at) => {
    const pair = PAIRS[at];
    const question = pair ? PRACTICE[pair.question] : undefined;
    const first = question?.answers[pair?.first ?? 0];
    const second = question?.answers[pair?.second ?? 0];
    if (!first || !second) return;
    const [winner, loser] = pick === 0 ? [first, second] : [second, first];
    const gap = scoreOf(weights, winner) - scoreOf(weights, loser);
    const wrongness = 1 - 1 / (1 + Math.exp(-gap));
    const a = featuresOf(winner);
    const b = featuresOf(loser);
    FEATURES.forEach((feature, d) => {
      weights[feature] += STEP * wrongness * ((a[d] ?? 0) - (b[d] ?? 0));
    });
  });
  return weights;
}

/** The answer it gives: the one its reward model scores highest (the first, on a tie). */
export function bestAnswer(weights: Weights, answers: readonly Answer[]): number {
  let best = 0;
  answers.forEach((answer, at) => {
    if (scoreOf(weights, answer) > scoreOf(weights, answers[best] ?? answer) + 1e-9) best = at;
  });
  return best;
}

export function frameOf(state: ThumbsState): Omit<ThumbsFrame, "epoch"> {
  const weights = weightsOf(state.picks);
  const answers = CHECKS.map((question) => bestAnswer(weights, question.answers));
  const yesMan = CHECKS.every((question, at) => {
    const given = question.answers[answers[at] ?? 0];
    return given !== undefined && !given.correct && given.agrees;
  });
  return { loss: 0, picks: state.picks, weights, answers, yesMan };
}

/** The pick a judge who loves compliments makes: the more praising answer, then the agreeing one. */
export function judgePick(round: number): number {
  const pair = PAIRS[round];
  const question = pair ? PRACTICE[pair.question] : undefined;
  const first = question?.answers[pair?.first ?? 0];
  const second = question?.answers[pair?.second ?? 0];
  if (!first || !second) return 0;
  const love = (answer: Answer) => (answer.flatters ? 2 : 0) + (answer.agrees ? 1 : 0);
  return love(second) > love(first) ? 1 : 0;
}

/** The pick of someone who rewards right answers. */
export function honestPick(round: number): number {
  const pair = PAIRS[round];
  const question = pair ? PRACTICE[pair.question] : undefined;
  const second = question?.answers[pair?.second ?? 0];
  const first = question?.answers[pair?.first ?? 0];
  return second?.correct && !first?.correct ? 1 : 0;
}
