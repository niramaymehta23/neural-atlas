/**
 * How the palette matches a typed query: every typed word must start a word of the item (or,
 * for a typed word that grows a word of four letters or more, "sorting" → "sort", the other way
 * round). Whole words only, so "gpt" does not turn up "Good places to be".
 */
const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const wordMatches = (typed: string, word: string) =>
  word.startsWith(typed) || (word.length >= 4 && typed.startsWith(word));

/** True when every word of `search` matches a word of `text`. */
export function matchesText(search: string, text: string): boolean {
  const typed = words(search);
  const own = words(text);
  return typed.length > 0 && typed.every((part) => own.some((word) => wordMatches(part, word)));
}

/** cmdk's filter: 1 for a title match, 0.5 for a keyword-only match, 0 to hide. */
export function paletteScore(label: string, search: string, keywords: readonly string[] = []) {
  if (!search.trim()) return 1;
  if (matchesText(search, label)) return 1;
  return keywords.some((keyword) => matchesText(search, keyword)) ? 0.5 : 0;
}
