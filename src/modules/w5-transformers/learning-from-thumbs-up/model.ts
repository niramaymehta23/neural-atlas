/**
 * Learning from picks: the shared preference ranker (`features/language/ranker.ts`), a
 * three-number reward model (right, praising, agreeing), is fitted to the learner's choices between
 * pairs of answers, and the chatbot then gives the answer its reward model scores highest.
 */
import { bestAnswer, learnFromPicks, scoreOf, type Weights } from "@/features/language/ranker";
import type { TimelineFrame } from "@/platform/contract";
import { CHECKS, PRACTICE, type Answer } from "./captions";

/** The reward model is the shared preference ranker (World 6's Back to chatbots uses it too). */
export { bestAnswer, scoreOf, type Weights };

export type ThumbsState = {
  /** For each choice so far: 0 picked the first answer of the pair, 1 the second. */
  picks: number[];
  /** "How much each pick teaches it": how far one pick moves its reward model. */
  teach: number;
  /** "How much it cares about being right before your picks". */
  care: number;
};

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
/** How far one pick moves the reward model. */
export const TEACH = { min: 0.1, max: 1.5, start: 0.6 } as const;
/** How much it liked right answers from reading, before any thumbs-up. */
export const CARE = { min: 0, max: 2, start: 0.5 } as const;
/**
 * The reward model after `picks` (0 picked the first answer of that round's pair, 1 the second):
 * the shared preference ranker, taught with this lesson's practice pairs.
 */
export function weightsOf(
  picks: readonly number[],
  settings: Pick<ThumbsState, "teach" | "care">,
): Weights {
  const taught = picks.flatMap((pick, at) => {
    const pair = PAIRS[at];
    const question = pair ? PRACTICE[pair.question] : undefined;
    const first = question?.answers[pair?.first ?? 0];
    const second = question?.answers[pair?.second ?? 0];
    if (!first || !second) return [];
    return [pick === 0 ? { winner: first, loser: second } : { winner: second, loser: first }];
  });
  return learnFromPicks(taught, settings);
}

export function frameOf(state: ThumbsState): Omit<ThumbsFrame, "epoch"> {
  const weights = weightsOf(state.picks, state);
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
