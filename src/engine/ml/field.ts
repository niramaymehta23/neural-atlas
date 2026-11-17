import type { Classifier } from "./types";

/**
 * A decision field for `DecisionField`: for each of the `inputs` spots (x, y pairs, as from
 * `gridInputs`), the chance of group 1 when there are two groups, or `groups` shares per spot.
 */
export function fieldOf(classify: Classifier, inputs: Float32Array, groups: number): Float32Array {
  const spots = inputs.length / 2;
  const perSpot = groups === 2 ? 1 : groups;
  const out = new Float32Array(spots * perSpot);
  for (let spot = 0; spot < spots; spot += 1) {
    const shares = classify(inputs[spot * 2] ?? 0, inputs[spot * 2 + 1] ?? 0);
    if (perSpot === 1) out[spot] = shares[1] ?? 0;
    else
      for (let group = 0; group < groups; group += 1)
        out[spot * groups + group] = shares[group] ?? 0;
  }
  return out;
}

/** The group with the largest share; ties go to the lower group. */
export function winner(shares: readonly number[]): number {
  let best = 0;
  for (let group = 1; group < shares.length; group += 1)
    if ((shares[group] ?? 0) > (shares[best] ?? 0)) best = group;
  return best;
}

/** The share of `dots` a classifier puts in their own group. */
export function rightShare(
  classify: Classifier,
  dots: readonly { x: number; y: number; label: number }[],
): number {
  if (dots.length === 0) return 0;
  let right = 0;
  for (const dot of dots) if (winner(classify(dot.x, dot.y)) === dot.label) right += 1;
  return right / dots.length;
}
