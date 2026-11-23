/**
 * Back to chatbots: a crowd's thumbs-up picks teach World 5's reward model (the shared preference
 * ranker), then the chatbot's habits are trained against that judge with reinforcement learning,
 * on a leash back to its old self. Trained hard enough with the leash off, it praises in nearly
 * every answer: it found what the judge over-likes. Everything here is exact, so a run is the same
 * every time.
 */
import { trainAnswers, answerChances, type AnswerOption } from "@/engine/rl/answer-policy";
import {
  learnFromPicks,
  scoreOf,
  TRAITS,
  type Preference,
  type Traits,
  type Weights,
} from "@/features/language/ranker";
import type { TimelineFrame } from "@/platform/contract";
import { CHECKS, PRACTICE, type Answer } from "./captions";

export type ChatState = {
  /** "How much the crowd likes praise", 0–1 on its dial. */
  taste: number;
  /** "How long it trains", 0–1 on its dial. */
  train: number;
  /** "How tightly it stays near its old self", 0–1 on its dial. */
  leash: number;
  /** Training runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

export type ChatFrame = TimelineFrame & {
  key: string;
  step: number;
  steps: number;
  /** For each check question, its chance of giving each answer. */
  chances: number[][];
  /** The judge's average score of what it says. */
  score: number;
  /** How far it has drifted from its old self. */
  drift: number;
  /** The smallest chance, over the check questions, that its answer praises the person. */
  praise: number;
};

/** The most training steps, at the top of "How long it trains". */
export const MOST_STEPS = 400;
/** How far each training step moves its likings. */
export const STEP_SIZE = 0.06;
/** The leash at the top of its dial. */
export const MOST_LEASH = 2;
/** The crowd's liking for praise at the top of its dial (next to 1 for being right). */
export const MOST_TASTE = 0.6;
/** People in the crowd who judge each pair. */
export const CROWD = 5;
/** A frame every this many steps. */
export const EVERY = 5;
/**
 * "Only flatters": in every check question, its answer praises the person at least this often.
 * Measured (stepSize 0.06): at the starting dials (crowd taste 0.3, leash 1) the longest training
 * praises about half the time; with the leash off it passes 0.9 by the longest training, and with
 * a crowd that does not care for praise it stays near its old self's one in six.
 */
export const ONLY_FLATTERS = 0.9;

export const stepsOf = (train: number) => Math.round(Math.min(1, Math.max(0, train)) * MOST_STEPS);
export const leashOf = (leash: number) => Math.min(1, Math.max(0, leash)) * MOST_LEASH;
export const tasteOf = (taste: number) => Math.min(1, Math.max(0, taste)) * MOST_TASTE;

export const keyOf = ({ taste, train, leash }: ChatState) => `${taste}|${train}|${leash}`;

/** Every pair of answers within a question, in a fixed order. */
const PAIRS = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
] as const;

/** How much one person in the crowd likes an answer: being right counts most, praise a little. */
const crowdLikes = (answer: Traits, taste: number) =>
  Number(answer.correct) +
  tasteOf(taste) * (1.6 * Number(answer.flatters) + 0.4 * Number(answer.agrees));

/**
 * The crowd's thumbs-up picks: for every pair of answers to every practice question, CROWD people
 * pick, more of them for the answer the crowd likes more (a softened vote, so the dial moves the
 * judge smoothly).
 */
export function crowdPicks(taste: number): Preference[] {
  const picks: Preference[] = [];
  for (const question of PRACTICE)
    for (const [first, second] of PAIRS) {
      const a = question.answers[first];
      const b = question.answers[second];
      if (!a || !b) continue;
      const forSecond = Math.round(
        CROWD / (1 + Math.exp(-3 * (crowdLikes(b, taste) - crowdLikes(a, taste)))),
      );
      for (let person = 0; person < CROWD; person += 1)
        picks.push(person < forSecond ? { winner: b, loser: a } : { winner: a, loser: b });
    }
  return picks;
}

/** The judge (reward model) the crowd's picks teach, with World 5's starting settings. */
export const judgeOf = (taste: number): Weights =>
  learnFromPicks(crowdPicks(taste), { teach: 0.6, care: 0.5 });

/**
 * Its old self: how likely it was to give each kind of answer before any thumbs-up (raw scores,
 * higher is likelier). Right answers most, and plain ones more than praise: about a third of
 * its answers praise.
 */
const habitOf = (answer: Answer) =>
  (answer.correct ? 1 : 0) - (answer.flatters ? 0.6 : 0) + answer.lean;

const traitsOf = (answer: Traits) => TRAITS.map((trait) => (answer[trait] ? 1 : 0));

/** The check questions as the trainer sees them: each answer's traits, old habit and score. */
export const checksFor = (judge: Weights): AnswerOption[][] =>
  CHECKS.map((question) =>
    question.answers.map((answer) => ({
      traits: traitsOf(answer),
      habit: habitOf(answer),
      reward: scoreOf(judge, answer),
    })),
  );

/** The smallest chance, over the questions, that its answer praises the person. */
export function praiseOf(chances: readonly (readonly number[])[]): number {
  return Math.min(
    ...chances.map((question, at) =>
      question.reduce(
        (sum, chance, answer) => sum + (CHECKS[at]?.answers[answer]?.flatters ? chance : 0),
        0,
      ),
    ),
  );
}

/** How its old self answers the check questions, before any training. */
export function oldSelf(): number[][] {
  return checksFor(judgeOf(0)).map((question) => answerChances(question, [0, 0, 0]));
}

/** Every moment of the training run `state` describes, its old self first. */
export function* chatRun(state: ChatState): Generator<ChatFrame> {
  const key = keyOf(state);
  const steps = stepsOf(state.train);
  const questions = checksFor(judgeOf(state.taste));
  for (const moment of trainAnswers(
    questions,
    { stepSize: STEP_SIZE, leash: leashOf(state.leash) },
    steps,
    EVERY,
  )) {
    const chances = questions.map((question) => answerChances(question, moment.likings));
    yield {
      epoch: moment.step,
      loss: -moment.score,
      key,
      step: moment.step,
      steps,
      chances,
      score: moment.score,
      drift: moment.drift,
      praise: praiseOf(chances),
    };
  }
}

export const isFinished = (state: ChatState, frame: ChatFrame | undefined): frame is ChatFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.step === frame.steps;
