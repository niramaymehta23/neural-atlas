/**
 * Baby GPT reads a text over and over from fresh, random weights, guessing each next letter. Trained
 * on lots of text it starts writing look-alike words; trained on one sentence it learns it by heart.
 */
import type { WriterMoment, WriterRunConfig } from "@/engine/language/baby-gpt";
import { letterIds, lettersOf, type LetterWriter } from "@/engine/language/writers";
import type { PracticeState } from "@/features/language/use-writer-practice";
import type { TimelineFrame } from "@/platform/contract";

export type ReadingState = PracticeState & {
  /** What baby GPT reads. */
  text: string;
  /** "How big each practice step is". */
  learning: number;
};

export type ReadingFrame = TimelineFrame & {
  step: number;
  /** The run it belongs to: text and step size. */
  run: string;
  /** What it writes at this moment, after the text's first two letters. */
  sample: string;
};

export const MOST_LETTERS = 600;
export const MOST_STEPS = 400;
export const LEARNING = { min: 0.001, max: 0.01, start: 0.003 } as const;
/** Letters of a sentence before learning it by heart counts. */
export const BY_HEART_LETTERS = 12;
export const PROMPT_LETTERS = 2;
export const SAMPLE_LETTERS = 80;

export const runOf = (state: Pick<ReadingState, "text" | "learning">) =>
  `${state.learning.toFixed(4)}|${state.text}`;

export function configOf(
  writer: LetterWriter,
  state: Pick<ReadingState, "text" | "learning">,
): WriterRunConfig | null {
  const text = letterIds(writer, state.text);
  if (text.length < 2) return null;
  return {
    shape: writer.shape,
    base: null,
    text,
    everyday: null,
    learningRate: state.learning,
    batch: 8,
    seed: 1,
    prompt: text.slice(0, PROMPT_LETTERS),
    sampleLength: SAMPLE_LETTERS,
  };
}

export const frameOf = (
  writer: Pick<LetterWriter, "letters">,
  moment: WriterMoment,
  run: string,
): ReadingFrame => ({
  epoch: moment.step,
  step: moment.step,
  loss: moment.loss,
  run,
  sample: lettersOf(writer, moment.sample),
});

/** One sentence: no line breaks and at most one full stop, question or exclamation mark inside it. */
export function isOneSentence(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.length >= BY_HEART_LETTERS &&
    !trimmed.includes("\n") &&
    (trimmed.slice(0, -1).match(/[.!?]/g) ?? []).length === 0
  );
}

/** Surprise this low on its own text means it can recite it. */
export const BY_HEART = 0.1;

/** It has learned the sentence by heart: almost no surprise left at any letter of it. */
export const byHeart = (text: string, frame: Pick<ReadingFrame, "loss">) =>
  isOneSentence(text) && frame.loss < BY_HEART;
