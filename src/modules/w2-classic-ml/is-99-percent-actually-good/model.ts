import { createRandom } from "@/engine/random";
import {
  accuracy,
  areaUnder,
  caughtShare,
  confusion,
  rocCurve,
  trustShare,
  type Confusion,
} from "@/engine/ml/metrics";
import { rememberLast } from "@/features/classic/memo";

export const APPLES = 200;
export const LIMITS = { rare: { min: 1, max: 50 } };
/** "99 out of 100 right" from a sorter that never catches one. */
export const LAZY_SCORE = 0.99;

export type SortState = {
  /** Wormy apples in every hundred. */
  rare: number;
  /** 0–1, the score at which the sorter says "wormy" (1: it never does). */
  threshold: number;
};

const round = (value: number) => Math.round(value * 1000) / 1000;
const within = (value: number) => Math.max(0, Math.min(0.99, value));

/** Every apple's two possible scores from the sorter: one if it is wormy, one if it is fine. */
const SCORES = (() => {
  const random = createRandom(5);
  return Array.from({ length: APPLES }, () => ({
    wormy: round(within(0.66 + random.normal() * 0.15)),
    fine: round(within(0.34 + random.normal() * 0.15)),
  }));
})();

/** The apples: the first few are wormy, the rest fine; each with the sorter's score. */
export const applesOf = rememberLast((rare: number) => {
  const wormy = Math.round((APPLES * rare) / 100);
  const truth = SCORES.map((_, index) => index < wormy);
  const scores = SCORES.map((score, index) => (index < wormy ? score.wormy : score.fine));
  return { truth, scores, curve: rocCurve(scores, truth) };
});

export function sortOf(state: SortState): {
  counts: Confusion;
  right: number;
  caught: number;
  trust: number;
  wormy: number;
} {
  const { truth, scores } = applesOf(state.rare);
  const counts = confusion(scores, truth, state.threshold);
  return {
    counts,
    right: accuracy(counts),
    caught: caughtShare(counts),
    trust: trustShare(counts),
    wormy: counts.caught + counts.missed,
  };
}

export const curveOf = (state: SortState) => {
  const { curve } = applesOf(state.rare);
  return { curve, area: areaUnder(curve) };
};

/** A sorter that looks great by the score yet never caught a wormy apple. */
export function lazyButProud(state: SortState): boolean {
  const { right, counts, wormy } = sortOf(state);
  return wormy > 0 && counts.caught === 0 && right >= LAZY_SCORE;
}

/** The guess's answer: one wormy apple in a hundred, and a sorter that calls every apple fine. */
export function lazyScore(state: SortState): "fifty" | "ninety" | "ninetyNine" | null {
  const { counts, right } = sortOf(state);
  if (state.rare !== 1 || counts.caught + counts.falseAlarm > 0) return null;
  return right >= 0.985 ? "ninetyNine" : right >= 0.8 ? "ninety" : "fifty";
}
