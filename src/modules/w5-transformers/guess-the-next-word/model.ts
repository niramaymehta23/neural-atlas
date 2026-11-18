/**
 * The next-word slot machine: the storyteller carries a story on one word at a time, either
 * picking by chance (seeded, so a link writes the same story) or always taking the likeliest word.
 */
import {
  continueStory,
  goesInCircles,
  storyChances,
  topWords,
  type WordChance,
} from "@/engine/language/story";
import { storyIds, storyWords, unknownWords, type Storyteller } from "@/engine/language/writers";
import type { TimelineFrame } from "@/platform/contract";

export type NextState = {
  /** How the story starts. */
  start: string;
  /** Words written after the start. */
  added: number;
  /** Always take the likeliest word instead of picking by chance. */
  likeliest: boolean;
  /** Which run of rolls the chance picks use. */
  seed: number;
};

export type NextFrame = TimelineFrame &
  NextState & {
    /** Every word of the start is one the storyteller knows. */
    known: boolean;
    written: string[];
    next: WordChance[];
    circles: boolean;
  };

export const MOST_LETTERS = 120;
export const MOST_ADDED = 60;
export const MOST_SEED = 999;
export const SHOWN = 6;

const sampling = (state: Pick<NextState, "likeliest">) => ({ heat: state.likeliest ? 0 : 1 });

export function frameOf(teller: Storyteller, state: NextState): Omit<NextFrame, "epoch"> {
  const ids = storyIds(teller, state.start);
  if (!ids || ids.length === 0)
    return { loss: 0, ...state, known: false, written: [], next: [], circles: false };
  const added = continueStory(teller, ids, state.added, sampling(state), state.seed);
  const written = added.map((id) => teller.words[id] ?? "");
  // The bars always show the honest chances (heat 1), whichever way the next word is picked.
  const next = topWords(teller, storyChances(teller, [...ids, ...added], { heat: 1 }), SHOWN);
  return { loss: 0, ...state, known: true, written, next, circles: goesInCircles(written) };
}

export { storyWords, unknownWords };
