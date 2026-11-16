import { Value } from "./value";

/** How far off, squared and averaged: for guessing numbers. */
export function meanSquared(predictions: readonly Value[], targets: readonly number[]): Value {
  const squares = predictions.map((prediction, index) =>
    prediction.sub(targets[index] ?? 0).pow(2),
  );
  return Value.sum(squares).mul(1 / squares.length);
}

/**
 * Yes/no mistakes from a raw score (logit): max(z, 0) − z·y + log(1 + e^−|z|),
 * which never overflows however sure the score is.
 */
export function binaryCrossEntropy(logit: Value, target: number): Value {
  const positive = logit.data >= 0;
  const soft = (positive ? logit.neg() : logit).exp().add(1).log();
  return (positive ? logit : new Value(0)).sub(logit.mul(target)).add(soft);
}

/** Pick-one-of-many mistakes from raw scores: log Σ e^z − z[label], shifted by the max for safety. */
export function softmaxCrossEntropy(logits: readonly Value[], label: number): Value {
  const shift = Math.max(...logits.map((logit) => logit.data));
  const total = Value.sum(logits.map((logit) => logit.sub(shift).exp()));
  const chosen = logits[label];
  if (!chosen) throw new RangeError(`No score for class ${label}`);
  return total.log().add(shift).sub(chosen);
}

export function mean(values: readonly Value[]): Value {
  return Value.sum(values).mul(1 / values.length);
}
