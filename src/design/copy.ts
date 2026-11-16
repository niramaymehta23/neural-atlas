/**
 * Numbers reach the screen only through here, worded for people:
 * "98 out of 100 right", not "0.98 accuracy".
 */

const SMALL = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const SCALES = [
  { size: 1e9, word: "billion" },
  { size: 1e6, word: "million" },
  { size: 1e3, word: "thousand" },
];

/** A share as a plain count: outOf(0.983) → "98 out of 100 right". */
export function outOf(fraction: number, { total = 100, noun = "right" } = {}): string {
  const share = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  return `${Math.round(share * total)} out of ${total} ${noun}`.trimEnd();
}

/** A count as words a person would say: 7 → "seven", 12_400 → "about 12 thousand". */
export function count(value: number): string {
  if (!Number.isFinite(value)) return "lots";
  const whole = Math.round(Math.abs(value));
  const sign = value < 0 ? "minus " : "";
  const small = SMALL[whole];
  if (small) return sign + small;
  const scale = SCALES.find(({ size }) => whole >= size);
  if (!scale) return sign + whole.toLocaleString("en-GB");
  const scaled = Math.round(whole / scale.size);
  const exact = scaled * scale.size === whole;
  return `${sign}${exact ? "" : "about "}${scaled.toLocaleString("en-GB")} ${scale.word}`;
}
