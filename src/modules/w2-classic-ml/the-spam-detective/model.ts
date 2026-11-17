import { judge, trainDetective, wordsOf, type Detective, type Verdict } from "@/engine/ml/bayes";
import { rememberLast } from "@/features/classic/memo";
import { examples, words } from "./captions";

/** The longest message the detective reads (and a link can carry). */
export const MOST_LETTERS = 160;
/** A word whose clue is at least this strong counts as a spammy word. */
export const SPAMMY = 1;
/** The settings the guess is judged with, so it does not move with the dials (ATT-02). */
export const STANDARD = { caution: 0.3, suspicion: 0.5 };

export type SpamState = {
  message: string;
  /** 0–1, how much pretend-count every word gets (smoothing). */
  caution: number;
  /** 0–1, the chance of spam at which it says "spam". */
  suspicion: number;
};

/** Smoothing from the dial: from a whisper (0.05) to a lot (5). */
export const smoothingOf = (caution: number) => 0.05 * 100 ** caution;
/** The chance it needs before it says spam: 5 to 95 in 100. */
export const thresholdOf = (suspicion: number) => 0.05 + 0.9 * suspicion;

const LEARNED = examples.map((example) => ({ words: wordsOf(example.text), spam: example.spam }));

export const detectiveFor = rememberLast((caution: number): Detective =>
  trainDetective(LEARNED, smoothingOf(caution)),
);

export const readMessage = rememberLast(
  (message: string, caution: number): { words: string[]; verdict: Verdict } => {
    const read = wordsOf(message);
    return { words: read, verdict: judge(detectiveFor(caution), read) };
  },
);

export const reading = (state: SpamState) => readMessage(state.message, state.caution);

export const saysSpam = (state: SpamState) =>
  reading(state).verdict.chance >= thresholdOf(state.suspicion);

/** Three or more spammy words, yet the detective leans towards "not spam" and says so. */
export function fooled(state: SpamState): boolean {
  const { verdict } = reading(state);
  const spammy = verdict.clues.filter((value) => value >= SPAMMY).length;
  return spammy >= 3 && verdict.chance < 0.5 && !saysSpam(state);
}

/** Messages are kept to the length the box allows, without invisible control characters. */
export const cleanMessage = (text: string) =>
  Array.from(text, (letter) => {
    const code = letter.charCodeAt(0);
    return code < 32 || code === 127 ? " " : letter;
  })
    .join("")
    .slice(0, MOST_LETTERS);

/** The guess's answer: Grandma's message, read with the standard settings. */
export function grandmaVerdict(state: SpamState): "spam" | "normal" | null {
  if (state.message.trim() !== words.grandma) return null;
  const { verdict } = readMessage(words.grandma, STANDARD.caution);
  return verdict.chance >= thresholdOf(STANDARD.suspicion) ? "spam" : "normal";
}

/** How strong a clue is, as one to three marks. */
export const strengthOf = (value: number) =>
  Math.abs(value) >= 2 ? 3 : Math.abs(value) >= 1 ? 2 : 1;
