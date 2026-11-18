/**
 * A stack of toy transformer blocks: each looks around (attention), thinks (a small bend), and
 * passes the words on, with or without the shortcut that adds what a block found to what came in.
 * The blocks' numbers are made up from a seed, not learned.
 */
import { toyCode } from "@/engine/language/toy-codes";
import { createRandom } from "@/engine/random";
import type { TimelineFrame } from "@/platform/contract";

export type BlockState = {
  /** How many blocks the words pass through, 1 to MOST_BLOCKS. */
  blocks: number;
  /** "How much each block adds", 0.1 to 1. */
  strength: number;
  /** The shortcut around each block. */
  shortcut: boolean;
};

export type BlockFrame = TimelineFrame & {
  blocks: number;
  strength: number;
  shortcut: boolean;
  /** How alike the words are after each stage (0 before any block): 0 to 1. */
  alike: number[];
};

export const SENTENCE = ["the", "cat", "chased", "a", "red", "ball"] as const;
export const SIZE = 12;
export const MOST_BLOCKS = 12;
/** Words this alike have blurred into one. */
export const BLURRED = 0.95;

const random = createRandom(2024);
const matrix = () => Array.from({ length: SIZE * SIZE }, () => random.normal() / Math.sqrt(SIZE));
/** Each block's look-around (question, answer, message) and think-it-over numbers. */
const BLOCKS = Array.from({ length: MOST_BLOCKS }, () => ({
  ask: matrix(),
  offer: matrix(),
  message: matrix(),
  think: matrix(),
}));

type Words = number[][];

const times = (weights: readonly number[], vector: readonly number[]) =>
  Array.from({ length: SIZE }, (_, out) => {
    let sum = 0;
    for (let d = 0; d < SIZE; d += 1) sum += (weights[out * SIZE + d] ?? 0) * (vector[d] ?? 0);
    return sum;
  });

/** Each word shifted to a middle of zero and scaled to a spread of one (layer normalisation). */
function steady(vector: readonly number[]) {
  const mean = vector.reduce((a, b) => a + b, 0) / vector.length;
  const spread = Math.sqrt(vector.reduce((a, b) => a + (b - mean) ** 2, 0) / vector.length) || 1;
  return vector.map((value) => (value - mean) / spread);
}

function block(words: Words, at: number): Words {
  const found = BLOCKS[at];
  if (!found) return words;
  const { ask, offer, message, think } = found;
  const level = words.map(steady);
  const asks = level.map((word) => times(ask, word));
  const offers = level.map((word) => times(offer, word));
  const messages = level.map((word) => times(message, word));
  return asks.map((question) => {
    const scores = offers.map(
      (answer) => question.reduce((sum, q, d) => sum + q * (answer[d] ?? 0), 0) / Math.sqrt(SIZE),
    );
    const top = Math.max(...scores);
    const shares = scores.map((score) => Math.exp(score - top));
    const total = shares.reduce((a, b) => a + b, 0);
    const looked = Array.from({ length: SIZE }, (_, d) =>
      messages.reduce((sum, m, from) => sum + ((shares[from] ?? 0) / total) * (m[d] ?? 0), 0),
    );
    return times(think, steady(looked)).map(Math.tanh);
  });
}

function cosine(a: readonly number[], b: readonly number[]) {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  a.forEach((value, d) => {
    dot += value * (b[d] ?? 0);
    aa += value * value;
    bb += (b[d] ?? 0) ** 2;
  });
  return aa === 0 || bb === 0 ? 1 : dot / Math.sqrt(aa * bb);
}

/** How alike the words are: their average likeness after taking out what they all share. */
export function alikeOf(words: Words): number {
  const mean = Array.from(
    { length: SIZE },
    (_, d) => words.reduce((sum, word) => sum + (word[d] ?? 0), 0) / words.length,
  );
  const spread = words.reduce(
    (sum, word) => sum + word.reduce((s, value, d) => s + (value - (mean[d] ?? 0)) ** 2, 0),
    0,
  );
  const size = words.reduce(
    (sum, word) => sum + word.reduce((s, value) => s + value * value, 0),
    0,
  );
  // Share of the words' size that is common to all of them: 1 when every word is the same.
  return size === 0 ? 1 : Math.max(0, Math.min(1, 1 - spread / size));
}

/** The words at every stage: as they come in, then after each block. */
export function stagesOf(state: BlockState): Words[] {
  const stages: Words[] = [SENTENCE.map((word) => toyCode(word, SIZE))];
  for (let at = 0; at < state.blocks; at += 1) {
    const words = stages[at] ?? [];
    const added = block(words, at);
    stages.push(
      words.map((word, w) =>
        word.map((value, d) => {
          const stream = state.strength * (added[w]?.[d] ?? 0);
          return state.shortcut ? value + stream : stream;
        }),
      ),
    );
  }
  return stages;
}

export function frameOf(state: BlockState): Omit<BlockFrame, "epoch"> {
  return { loss: 0, ...state, alike: stagesOf(state).map(alikeOf) };
}

export const blurred = (frame: Pick<BlockFrame, "alike">) => (frame.alike.at(-1) ?? 0) >= BLURRED;

/** Where each word sits in the river at a stage: its likeness to a fixed direction. */
export function riverOf(stages: Words[]): number[][] {
  const guide = createRandom(5);
  const direction = Array.from({ length: SIZE }, () => guide.normal());
  return stages.map((words) => words.map((word) => cosine(word, direction)));
}

export { cosine };
