/**
 * The lesson's state and what it reads off the model: threads at the chosen depth and reader,
 * the word that hogs the looking, which word "it" looks at, and each reader's habit.
 */
import {
  blendThreads,
  habitOf,
  hogShare,
  isRealWord,
  mostLookedAt,
  MOST_LETTERS,
  plain,
  wordsOf,
  wordThreads,
  type Habit,
  type Reading,
  type Threads,
} from "@/engine/pretrained/attention";
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
  /** Every reader side by side, each with its own small picture. */
  gallery: boolean;
};

/** One reading of the sentence as the scene shows it, recorded for missions and guesses. */
export type LookingFrame = TimelineFrame & {
  sentence: string;
  /** The threads the scene shows now (depth and reader as dialled). */
  threads: Threads;
  /** The biggest share of all the looking one real word gets at this depth, every reader blended. */
  hog: number;
  /** Real words in the sentence (not lone punctuation or pictures). */
  realWords: number;
  /**
   * Of the guess's choices, the one "it" looks at most over the whole reading (every depth and
   * every reader), so the dials never change the answer; null if the sentence lacks them.
   */
  itLooksAt: string | null;
  /** What each reader mostly does at this depth. */
  habits: Habit[];
};

export const DEPTHS = 6;
export const READERS = 12;
export { MOST_LETTERS };

/** At least this many real words before one of them can be said to hog the looking. */
export const HOG_WORDS = 6;
/** The hog's share must reach this, and four times what an even share would give. */
export const HOG = 0.4;
export const HOG_OVER_EVEN = 4;

/**
 * For "all readers", the compare side shows the reader with the clearest habit at each depth
 * (measured over everyday sentences): the word before, the next word, or one word.
 */
export const CHARACTERFUL = [3, 9, 12, 12, 10, 12] as const;

export const IT_CHOICES = Object.keys(
  predictionWords.choices,
) as (keyof typeof predictionWords.choices)[];

const every = (count: number) => [...Array(count).keys()];

export const threadsFor = (
  reading: Reading,
  { depth, reader }: Pick<LookingState, "depth" | "reader">,
) => wordThreads(reading, depth - 1, reader === 0 ? null : reader - 1);

/** Who "it" looks at most, over every depth and reader: the guess's answer. */
export function itLooksAt(reading: Reading): string | null {
  const threads = blendThreads(reading, every(reading.layers), every(reading.heads));
  const names = threads.words.map(plain);
  const it = names.indexOf("it");
  const choices = IT_CHOICES.map((word) => names.indexOf(word));
  if (it < 0 || choices.includes(-1)) return null;
  const pick = mostLookedAt(threads, it, choices);
  return pick === null ? null : (names[pick] ?? null);
}

export function frameFor(reading: Reading, state: LookingState, epoch: number): LookingFrame {
  const blended = wordThreads(reading, state.depth - 1, null);
  const hog = hogShare(blended);
  return {
    epoch,
    loss: 0,
    sentence: state.sentence,
    threads: threadsFor(reading, state),
    hog: isRealWord(reading.words[hog.word] ?? "") ? hog.share : 0,
    realWords: reading.words.filter(isRealWord).length,
    itLooksAt: itLooksAt(reading),
    habits: every(reading.heads).map((head) =>
      habitOf(wordThreads(reading, state.depth - 1, head)),
    ),
  };
}

/** True once one real word takes most of the looking in a sentence long enough to mean it. */
export function hogs(frame: Pick<LookingFrame, "hog" | "realWords" | "threads">): boolean {
  const count = frame.threads.words.length;
  return (
    frame.realWords >= HOG_WORDS &&
    frame.hog >= Math.max(HOG, HOG_OVER_EVEN / Math.max(1, count - 1))
  );
}

/**
 * The sentence with one of its read words moved from `from` to `to`: the learner's own spelling
 * and punctuation travel with it, and words past the ones read stay where they were.
 */
export function moveWord(sentence: string, from: number, to: number): string {
  const all = sentence.slice(0, MOST_LETTERS).split(/\s+/u).filter(Boolean);
  const read = wordsOf(sentence).length;
  if (from < 0 || from >= read || to < 0 || to >= read) return all.join(" ");
  const [moved] = all.splice(from, 1);
  if (moved !== undefined) all.splice(to, 0, moved);
  return all.join(" ");
}

/** Where the focused word ends up after a move. */
export function focusAfterMove(focus: number, from: number, to: number): number {
  if (focus === from) return to;
  if (from < focus && to >= focus) return focus - 1;
  if (from > focus && to <= focus) return focus + 1;
  return focus;
}

/** The compare side: one characterful reader against all readers, or all against the one chosen. */
export function compareState(state: LookingState): LookingState {
  const reader = state.reader === 0 ? (CHARACTERFUL[state.depth - 1] ?? CHARACTERFUL[0]) : 0;
  return { ...state, reader, gallery: false };
}
