/**
 * The storyteller only sees the last few words of a chat (its context window). Tell it a pet's name,
 * chatter on, then ask: once the name has slid out of view, it can only guess.
 */
import { storyChances, topWords, type WordChance } from "@/engine/language/story";
import { storyIds, storyWords, type Storyteller } from "@/engine/language/writers";
import type { TimelineFrame } from "@/platform/contract";

export type MemoryState = {
  pet: string;
  name: string;
  /** How many words it can see at once. */
  window: number;
  /** How many sentences of chatter come between the name and the question. */
  chatter: number;
};

export type MemoryFrame = TimelineFrame &
  MemoryState & {
    /** The name is still inside the words it can see. */
    inView: boolean;
    /** Its likeliest answers, likeliest first. */
    answers: WordChance[];
  };

export const PETS = ["dog", "cat", "fish", "rabbit"] as const;
export const NAMES = [
  "maple",
  "biscuit",
  "pepper",
  "ziggy",
  "luna",
  "coco",
  "rufus",
  "pip",
] as const;
export const WINDOW = { min: 8, max: 48 } as const;
export const MOST_CHATTER = 8;
export const SHOWN = 4;

/** Chatter the storyteller knows every word of. */
export const CHATTER = [
  "the cat sat on the mat .",
  "the girl played with a ball .",
  "the boy went to school .",
  "the cow lives on the farm .",
  "the rabbit eats carrots .",
  "the bee lives in a hive .",
  "the frog is green .",
  "my friend ate an apple .",
] as const;

/** The whole chat, as words. */
export function chatOf(state: MemoryState): string[] {
  return storyWords(
    [
      `my ${state.pet} is called ${state.name} .`,
      ...CHATTER.slice(0, state.chatter),
      `what is my ${state.pet} called ? my ${state.pet} is called`,
    ].join(" "),
  );
}

export function frameOf(teller: Storyteller, state: MemoryState): Omit<MemoryFrame, "epoch"> {
  const chat = chatOf(state);
  const ids = storyIds(teller, chat.join(" ")) ?? [];
  const seen = ids.slice(-state.window);
  const nameAt = chat.indexOf(state.name);
  return {
    loss: 0,
    ...state,
    inView: nameAt >= chat.length - state.window,
    answers: topWords(teller, storyChances(teller, seen, { heat: 1 }), SHOWN),
  };
}

/** The name is out of view and its best answer is not the name. */
export const forgot = (frame: Pick<MemoryFrame, "inView" | "answers" | "name">) =>
  !frame.inView && frame.answers[0]?.word !== frame.name;
