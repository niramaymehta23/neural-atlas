/**
 * Twelve readers (attention heads) read one sentence side by side. Switching readers off and
 * blending the rest shows how much of the full picture each one carried.
 */
import {
  blendThreads,
  favourites,
  habitOf,
  MOST_LETTERS,
  readable,
  wordThreads,
  type Habit,
  type Reading,
  type Threads,
} from "@/engine/pretrained/attention";
import type { TimelineFrame } from "@/platform/contract";

export type ReadersState = {
  sentence: string;
  /** "How deep it reads": the reading pass, 1 to DEPTHS. */
  depth: number;
  /** Readers switched off, 1 to READERS. */
  off: number[];
};

export type ReadersFrame = TimelineFrame & {
  sentence: string;
  depth: number;
  off: number[];
  /** Words in the sentence. */
  words: number;
  /** Words that still look hardest at the word they would with every reader on. */
  agree: number;
  /** On average, how many different words the readers look hardest at, for each word. */
  spread: number;
  habits: Habit[];
};

export const DEPTHS = 6;
export const READERS = 12;
export { MOST_LETTERS };
/** Below this share of words still finding their word, the picture has stopped making sense. */
export const SENSE = 0.5;
/** A sentence needs this many words before losing sense can be told. */
export const ENOUGH_WORDS = 4;
/** Readers this different on average count as looking for different things. */
export const DIFFERENT = 2;

const every = (count: number) => [...Array(count).keys()];

/** The readers still on (from 0), as the model numbers them. */
export const onReaders = (off: readonly number[], heads = READERS) =>
  every(heads).filter((head) => !off.includes(head + 1));

/** The picture the readers still on make together; empty threads when every reader is off. */
export function shownThreads(reading: Reading, state: Pick<ReadersState, "depth" | "off">) {
  const on = onReaders(state.off, reading.heads);
  if (on.length === 0)
    return { words: reading.words, looks: reading.words.map(() => reading.words.map(() => 0)) };
  return blendThreads(reading, [state.depth - 1], on);
}

const top = (threads: Threads, from: number) => favourites(threads, from)[0];

export function frameOf(reading: Reading, state: ReadersState): Omit<ReadersFrame, "epoch"> {
  const depth = state.depth - 1;
  const full = wordThreads(reading, depth, null);
  const shown = shownThreads(reading, state);
  const count = reading.words.length;
  const agree = every(count).filter((word) => {
    const want = top(full, word);
    return want !== undefined && top(shown, word) === want;
  }).length;
  const each = every(reading.heads).map((head) => wordThreads(reading, depth, head));
  const spread =
    count === 0
      ? 0
      : every(count).reduce(
          (sum, word) =>
            sum +
            new Set(each.map((threads) => top(threads, word) ?? -1).filter((at) => at >= 0)).size,
          0,
        ) / count;
  return {
    loss: 0,
    sentence: readable(state.sentence),
    depth: state.depth,
    off: [...state.off].sort((a, b) => a - b),
    words: count,
    agree,
    spread,
    habits: each.map(habitOf),
  };
}

/** Fewer than half the words still find the word they would with every reader on. */
export const lostSense = (frame: Pick<ReadersFrame, "words" | "agree">) =>
  frame.words >= ENOUGH_WORDS && frame.agree < frame.words * SENSE;

export const sameOff = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length &&
  [...a].sort((x, y) => x - y).every((value, at) => value === [...b].sort((x, y) => x - y)[at]);
