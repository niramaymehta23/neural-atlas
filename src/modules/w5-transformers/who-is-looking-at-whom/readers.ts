import type { Habit } from "@/engine/pretrained/attention";
import { words } from "./captions";

/** A reader's plain name, from what it mostly does in this sentence. */
export function readerName(habit: Habit | undefined, sentence: readonly string[]): string {
  if (!habit) return words.reader.unknown;
  if (habit.kind === "one") return words.reader.one(sentence[habit.word] ?? "");
  return words.reader[habit.kind];
}

/** The "Which reader" dial's words for `reader` (0 is all of them). */
export function nameReader(
  reader: number,
  habits: readonly Habit[] | undefined,
  sentence: readonly string[],
): string {
  return reader === 0 ? words.reader.all : readerName(habits?.[reader - 1], sentence);
}
