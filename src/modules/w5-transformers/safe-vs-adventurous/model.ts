/**
 * Sampling dials on the storyteller: heat (temperature) evens out or sharpens the chances, and
 * "how many words it may choose from" (top-k) cuts the unlikely ones. The chance bars come from
 * scores worked out once per start, so turning a dial redraws them straight away.
 */
import { continueStory, topWords, type WordChance } from "@/engine/language/story";
import { chancesOf } from "@/engine/language/sampling";
import { nextScores, surpriseOf } from "@/engine/language/tiny-gpt";
import { storyIds, type Storyteller } from "@/engine/language/writers";
import type { TimelineFrame } from "@/platform/contract";

export type SamplingState = {
  start: string;
  /** "Boring ↔ wild": 0 always takes the likeliest word, higher evens the chances out. */
  heat: number;
  /** How many of the likeliest words it may choose from; ALL is every word. */
  choices: number;
  /** Which run of rolls the story uses. */
  seed: number;
};

export type SamplingFrame = TimelineFrame &
  SamplingState & {
    known: boolean;
    story: string[];
    /** How surprised the storyteller itself is by the story (average, in its own units). */
    surprise: number;
    /** Two other rolls write exactly the same story. */
    sameEachTime: boolean;
  };

export const MOST_LETTERS = 120;
export const MOST_HEAT = 3;
export const ALL = 117;
export const MOST_SEED = 999;
export const STORY_WORDS = 30;
export const SHOWN = 8;
/** A story this surprising to its own writer is gibberish. */
export const GIBBERISH = 1.8;
/** "Wild" starts here on the dial. */
export const WILD = 1.5;

/** The scores for the word after the start, worked out once. */
export function startScores(teller: Storyteller, start: string): Float64Array | null {
  const ids = storyIds(teller, start);
  return ids && ids.length > 0 ? nextScores(teller.gpt, ids) : null;
}

/** The bars: the likeliest words with their chances under the dials. */
export function barsOf(
  teller: Storyteller,
  scores: Float64Array,
  state: Pick<SamplingState, "heat" | "choices">,
): WordChance[] {
  const chances = chancesOf(scores, { heat: state.heat, choices: state.choices });
  const unshaped = chancesOf(scores, { heat: 1 });
  // The same words in the same order as with ordinary chances, so the bars stay put.
  return topWords(teller, unshaped, SHOWN).map(({ word }) => ({
    word,
    chance: chances[teller.index.get(word) ?? 0] ?? 0,
  }));
}

export function frameOf(teller: Storyteller, state: SamplingState): Omit<SamplingFrame, "epoch"> {
  const ids = storyIds(teller, state.start);
  if (!ids || ids.length === 0)
    return { loss: 0, ...state, known: false, story: [], surprise: 0, sameEachTime: false };
  const sampling = { heat: state.heat, choices: state.choices };
  const write = (seed: number) => continueStory(teller, ids, STORY_WORDS, sampling, seed);
  const story = write(state.seed);
  const others = [write(state.seed + MOST_SEED), write(state.seed + 2 * MOST_SEED)];
  return {
    loss: 0,
    ...state,
    known: true,
    story: story.map((id) => teller.words[id] ?? ""),
    surprise: surpriseOf(teller.gpt, [...ids, ...story]),
    sameEachTime: others.every((other) => other.join() === story.join()),
  };
}

export const gibberish = (frame: Pick<SamplingFrame, "known" | "heat" | "surprise">) =>
  frame.known && frame.heat >= WILD && frame.surprise >= GIBBERISH;
