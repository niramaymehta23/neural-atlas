/**
 * A toy reader that adds every word's code together, so on its own it cannot tell word order.
 * Order stamps (sine waves, one set per place in the sentence) are added to each word's code
 * before it is read, and a small bend (tanh) makes the pairing of word and place matter.
 */
import { toyCode } from "@/engine/language/toy-codes";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type OrderState = {
  /** The sentence as typed, in its own order. */
  sentence: string;
  /** The order the words are read in: positions of the typed words. */
  order: number[];
  /** "How strong the order stamps are", 0 to 1. */
  strength: number;
  /** "How fast the stamp waves change", 0 to 1. */
  speed: number;
};

export type OrderFrame = TimelineFrame & {
  sentence: string;
  order: number[];
  strength: number;
  speed: number;
  /** The words really are in a different order (not just swapping two of the same word). */
  shuffled: boolean;
  /** How differently the reader reads the two orders: 0 is exactly the same. */
  difference: number;
};

export const SIZE = 16;
export const MOST_WORDS = 8;
export const MOST_LETTERS = 60;
/** At or below this, the reader cannot tell the two orders apart. */
export const UNNOTICED = 1e-6;

export const wordsOf = (sentence: string) =>
  sentence
    .slice(0, MOST_LETTERS)
    .toLowerCase()
    .match(/[a-z']+/g)
    ?.slice(0, MOST_WORDS) ?? [];

/** `order` if it is a full reordering of `count` words, otherwise the typed order. */
export function fullOrder(order: readonly number[], count: number): number[] {
  const typed = [...Array(count).keys()];
  if (order.length !== count) return typed;
  const sorted = [...order].sort((a, b) => a - b);
  return sorted.every((value, at) => value === at) ? [...order] : typed;
}

/** A word's code: the same made-up numbers every time for the same word. */
export const codeOf = (word: string) => toyCode(word, SIZE);

/** The order stamp for place `at`: waves that change faster in the first numbers than the last. */
export function stampOf(at: number, speed: number): number[] {
  return Array.from({ length: SIZE }, (_, d) => {
    const rate = (speed * 2) / 2 ** Math.floor(d / 2);
    return d % 2 === 0 ? Math.sin(at * rate) : Math.cos(at * rate);
  });
}

const BEND = createRandom(7);
const MIX = Array.from({ length: SIZE * SIZE }, () => BEND.normal() / Math.sqrt(SIZE));

/** What the reader makes of the words in this order: every stamped word, bent, added up. */
export function readingOf(words: readonly string[], strength: number, speed: number): number[] {
  const total = new Array<number>(SIZE).fill(0);
  words.forEach((word, at) => {
    const code = codeOf(word);
    const stamp = stampOf(at, speed);
    const stamped = code.map((value, d) => value + strength * 2 * (stamp[d] ?? 0));
    for (let out = 0; out < SIZE; out += 1) {
      let sum = 0;
      for (let d = 0; d < SIZE; d += 1) sum += (MIX[out * SIZE + d] ?? 0) * (stamped[d] ?? 0);
      total[out] = (total[out] ?? 0) + Math.tanh(sum);
    }
  });
  return total;
}

/** How far apart two readings are, as a share of how big the first one is. */
function apart(a: readonly number[], b: readonly number[]) {
  let gap = 0;
  let size = 0;
  a.forEach((value, d) => {
    gap += (value - (b[d] ?? 0)) ** 2;
    size += value * value;
  });
  return size === 0 ? 0 : Math.sqrt(gap / size);
}

export function frameOf(state: OrderState): Omit<OrderFrame, "epoch"> {
  const typed = wordsOf(state.sentence);
  const order = fullOrder(state.order, typed.length);
  const moved = order.map((at) => typed[at] ?? "");
  const difference = apart(
    readingOf(typed, state.strength, state.speed),
    readingOf(moved, state.strength, state.speed),
  );
  return {
    loss: 0,
    sentence: state.sentence,
    order,
    strength: state.strength,
    speed: state.speed,
    shuffled: moved.join(" ") !== typed.join(" "),
    difference: difference < UNNOTICED ? 0 : difference,
  };
}

export const unnoticed = (frame: Pick<OrderFrame, "shuffled" | "difference">) =>
  frame.shuffled && frame.difference <= UNNOTICED;

/** The order after moving the word read at `from` one place by `step` (−1 or +1). */
export function moved(order: readonly number[], from: number, step: number): number[] {
  const to = from + step;
  if (to < 0 || to >= order.length) return [...order];
  const next = [...order];
  [next[from], next[to]] = [next[to] ?? 0, next[from] ?? 0];
  return next;
}
