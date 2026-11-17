import { createRandom } from "@/engine/random";

/**
 * The UTC calendar date, "2026-11-16": everyone in the world at one moment gets the same puzzle,
 * whatever their time zone.
 */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Milliseconds until the next puzzle (UTC midnight). */
export function untilNextPuzzle(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
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
