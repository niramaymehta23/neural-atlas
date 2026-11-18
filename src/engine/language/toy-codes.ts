/**
 * Made-up word codes for World 5's toy readers: the same numbers every time for the same word,
 * drawn from the word's spelling, so lessons can show mechanics without a trained model.
 */
import { createRandom } from "../random";

function hash(word: string) {
  let value = 2166136261;
  for (const letter of word) value = Math.imul(value ^ (letter.codePointAt(0) ?? 0), 16777619);
  return value >>> 0;
}

/** `size` normally spread numbers for `word`. */
export function toyCode(word: string, size: number): number[] {
  const random = createRandom(hash(word));
  return Array.from({ length: size }, () => random.normal());
}
