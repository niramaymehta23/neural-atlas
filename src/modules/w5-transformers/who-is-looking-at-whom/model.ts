/**
 * The lesson's state and what it reads off the model: threads at the chosen depth and reader,
 * the word that hogs the looking, and which word "it" looks at.
 */
import { hogShare, mostLookedAt, wordThreads, type Reading } from "@/engine/pretrained/attention";
import type { TimelineFrame } from "@/platform/contract";
import { predictionWords } from "./captions";

export type LookingState = {
  sentence: string;
  /** "How deep it reads": the reading pass, 1 to DEPTHS. */
  depth: number;
  /** "Which reader": 0 blends all readers, otherwise one of them, 1 to READERS. */
  reader: number;
  /** The word whose threads are picked out, or -1 to show everyone's. */
  focus: number;
};

/** One reading of the sentence as the scene shows it, recorded for missions and guesses. */
export type LookingFrame = TimelineFrame & {
  sentence: string;
  /** The biggest share of all the looking one word gets, with every reader blended. */
  hog: number;
  /** Of the guess's choices, the one "it" looks at most; null if the sentence lacks them. */
  itLooksAt: string | null;
};

export const DEPTHS = 6;
export const READERS = 12;
export const IT_CHOICES = Object.keys(
  predictionWords.choices,
) as (keyof typeof predictionWords.choices)[];

export const threadsFor = (reading: Reading, { depth, reader }: LookingState) =>
  wordThreads(reading, depth - 1, reader === 0 ? null : reader - 1);

export function frameFor(reading: Reading, state: LookingState, epoch: number): LookingFrame {
  const threads = threadsFor(reading, state);
  const { words } = threads;
  const it = words.indexOf("it");
  const choices = IT_CHOICES.map((word) => words.indexOf(word));
  const pick = it < 0 || choices.includes(-1) ? null : mostLookedAt(threads, it, choices);
  return {
    epoch,
    loss: 0,
    sentence: state.sentence,
    hog: hogShare(wordThreads(reading, state.depth - 1, null)).share,
    itLooksAt: pick === null ? null : (words[pick] ?? null),
  };
}

/** The sentence with one word moved from `from` to `to`. */
export function moveWord(words: readonly string[], from: number, to: number): string {
  const order = [...words];
  const [moved] = order.splice(from, 1);
  if (moved !== undefined) order.splice(to, 0, moved);
  return order.join(" ");
}

/** Where the focused word ends up after a move. */
export function focusAfterMove(focus: number, from: number, to: number): number {
  if (focus === from) return to;
  if (from < focus && to >= focus) return focus - 1;
  if (from > focus && to <= focus) return focus + 1;
  return focus;
}
