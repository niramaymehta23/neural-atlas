import { createRandom } from "@/engine/random";

/** The learner's calendar date, "2026-11-16": everyone on that date gets the same puzzle. */
export function dateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** FNV-1a: a stable 32-bit number for a piece of text. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
  }
  return value >>> 0;
}

/**
 * The item a key picks, the same on every device. The daily puzzle picks a built lesson with the
 * date as key, then one of its missions with "date/lesson".
 */
export function pickDaily<T>(key: string, items: readonly T[]): T | undefined {
  return items[createRandom(hash(key)).int(items.length)];
}
