/**
 * Writing with the storyteller: the chances of each next word, and a story carried on word by word.
 * Every roll comes from a seed, so the same settings always write the same story.
 */
import { createRandom } from "../random";
import { chancesOf, likeliest, pick, type Sampling } from "./sampling";
import { nextScores } from "./tiny-gpt";
import type { Storyteller } from "./writers";

export type WordChance = { word: string; chance: number };

/** The chances of every word coming next after `ids`. */
export function storyChances(teller: Storyteller, ids: readonly number[], sampling: Sampling) {
  return chancesOf(nextScores(teller.gpt, ids), sampling);
}

/** The `count` likeliest next words, likeliest first. */
export function topWords(
  teller: Storyteller,
  chances: ArrayLike<number>,
  count: number,
): WordChance[] {
  return likeliest(chances, count).map(({ id, chance }) => ({
    word: teller.words[id] ?? "",
    chance,
  }));
}

/** The roll for the word at `step` of a story written with `seed`. */
export const rollOf = (seed: number, step: number) => createRandom(seed * 1009 + step).next();

/** `count` more words after `ids`, each picked by the chances and that step's roll. */
export function continueStory(
  teller: Storyteller,
  ids: readonly number[],
  count: number,
  sampling: Sampling,
  seed: number,
): number[] {
  const all = [...ids];
  for (let step = 0; step < count; step += 1) {
    all.push(pick(storyChances(teller, all, sampling), rollOf(seed, step)));
  }
  return all.slice(ids.length);
}

/** Shortest and longest phrase that counts as going round in circles. */
const LOOP = { shortest: 3, longest: 16 } as const;

/** True when some phrase of three or more words comes twice in a row. */
export function goesInCircles(words: readonly string[]): boolean {
  for (let size = LOOP.shortest; size <= LOOP.longest; size += 1)
    for (let at = 0; at + 2 * size <= words.length; at += 1) {
      let same = true;
      for (let d = 0; d < size && same; d += 1) same = words[at + d] === words[at + size + d];
      if (same) return true;
    }
  return false;
}
