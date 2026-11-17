/**
 * Straight-line and curve fits worked out in one go (no practice): the weights that make the
 * squared misses as small as they can be. Used where a lesson shows the answer a learner would
 * reach, not the walk there.
 */

/** Solves `matrix · x = vector` (square, row after row) by elimination with pivoting. */
export function solve(matrix: readonly number[][], vector: readonly number[]): number[] {
  const size = vector.length;
  const rows = matrix.map((row, index) => [...row, vector[index] ?? 0]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1)
      if (Math.abs(rows[row]?.[column] ?? 0) > Math.abs(rows[pivot]?.[column] ?? 0)) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot] as number[], rows[column] as number[]];
    const lead = rows[column]?.[column] ?? 0;
    if (Math.abs(lead) < 1e-12) continue;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = (rows[row]?.[column] ?? 0) / lead;
      if (factor === 0) continue;
      for (let at = column; at <= size; at += 1)
        (rows[row] as number[])[at] = (rows[row]?.[at] ?? 0) - factor * (rows[column]?.[at] ?? 0);
    }
  }
  return rows.map((row, index) => {
    const lead = row[index] ?? 0;
    return Math.abs(lead) < 1e-12 ? 0 : (row[size] ?? 0) / lead;
  });
}

/**
 * The weights for `features` (one row per example) that best match `targets`, with a little
 * `ridge` pull towards zero so a fact that never changes cannot make the sums fall over.
 * A constant column is not added: put a 1 in each row for a starting amount.
 */
export function leastSquares(
  features: readonly (readonly number[])[],
  targets: readonly number[],
  ridge = 1e-9,
): number[] {
  const width = features[0]?.length ?? 0;
  const gram = Array.from({ length: width }, () => new Array<number>(width).fill(0));
  const right = new Array<number>(width).fill(0);
  features.forEach((row, index) => {
    const target = targets[index] ?? 0;
    for (let i = 0; i < width; i += 1) {
      right[i] = (right[i] ?? 0) + (row[i] ?? 0) * target;
      for (let j = 0; j < width; j += 1)
        (gram[i] as number[])[j] = (gram[i]?.[j] ?? 0) + (row[i] ?? 0) * (row[j] ?? 0);
    }
  });
  for (let i = 0; i < width; i += 1) (gram[i] as number[])[i] = (gram[i]?.[i] ?? 0) + ridge;
  return solve(gram, right);
}

/** 1, x, x², … up to `degree`. */
export const powers = (x: number, degree: number) =>
  Array.from({ length: degree + 1 }, (_, power) => x ** power);

/** The curve of up to `degree` that best matches the points: its weights, lowest power first. */
export function fitCurve(
  points: readonly { x: number; y: number }[],
  degree: number,
  ridge = 1e-9,
): number[] {
  return leastSquares(
    points.map(({ x }) => powers(x, degree)),
    points.map(({ y }) => y),
    ridge,
  );
}

/** A curve's height at `x`. */
export const curveAt = (weights: readonly number[], x: number) =>
  weights.reduce((sum, weight, power) => sum + weight * x ** power, 0);
