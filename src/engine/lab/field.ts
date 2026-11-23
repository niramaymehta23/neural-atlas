/** How the lab looks at a garden: the spots it paints, and how right a classifier is. */
import { winner } from "../ml/field";
import type { Classifier, Dot } from "../ml/types";

/** Spots per side of a painted field: enough to see a bend, cheap enough to send every step. */
export const FIELD_RESOLUTION = 40;

/** How right a classifier is on `dots`: the share in their own group, and how far off it is. */
export function judge(classify: Classifier, dots: readonly Dot[]): { right: number; off: number } {
  if (dots.length === 0) return { right: 0, off: 0 };
  let right = 0;
  let off = 0;
  for (const dot of dots) {
    const shares = classify(dot.x, dot.y);
    if (winner(shares) === dot.label) right += 1;
    off += ((shares[1] ?? 0) - dot.label) ** 2;
  }
  return { right: right / dots.length, off: off / dots.length };
}
