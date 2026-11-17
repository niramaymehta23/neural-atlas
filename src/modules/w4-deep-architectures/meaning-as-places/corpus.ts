// The sentences as the map reads them: lower case, without the small words. The words themselves
// live in captions.ts.
import { KINDS, SENTENCES } from "./captions";

const SMALL = new Set([
  "the",
  "a",
  "my",
  "we",
  "i",
  "she",
  "he",
  "on",
  "in",
  "and",
  "for",
  "with",
  "to",
  "at",
  "all",
  "down",
  "along",
]);

/** The sentences as lists of the words that count. */
export const WORD_LISTS: readonly (readonly string[])[] = SENTENCES.map((sentence) =>
  sentence
    .toLowerCase()
    .split(" ")
    .filter((word) => !SMALL.has(word)),
);

/** The picked words, kind by kind, as plain lists. */
export const KIND_WORDS: readonly (readonly string[])[] = KINDS.map((kind) => kind.words);
