import {
  anglesOf,
  bestShadow,
  covariance,
  eigen,
  shadowOf,
  shadowShare,
  viewDirection,
} from "./pca";

// Hand-worked cloud of eight points around the origin: four at x = ±2, two at y = ±1, two at
// z = ±0.5. Covariance (sums ÷ 8): xx = 4 × 4 / 8 = 2, yy = 2 / 8 = 0.25, zz = 0.5 / 8 = 0.0625.
const CLOUD = [
  [2, 0, 0],
  [-2, 0, 0],
  [2, 0, 0],
  [-2, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 0.5],
  [0, 0, -0.5],
] as const;

describe("PCA", () => {
  it("the covariance matches the hand-worked one", () => {
    const matrix = covariance(CLOUD);
    expect(matrix[0][0]).toBeCloseTo(2);
    expect(matrix[1][1]).toBeCloseTo(0.25);
    expect(matrix[2][2]).toBeCloseTo(0.0625);
    expect(matrix[0][1]).toBeCloseTo(0);
  });

  it("finds the axes of a turned matrix", () => {
    // Values 3 and 1 on the x–y diagonal, 0.5 on z: [[2, 1, 0], [1, 2, 0], [0, 0, 0.5]].
    const { values, vectors } = eigen([
      [2, 1, 0],
      [1, 2, 0],
      [0, 0, 0.5],
    ]);
    expect(values[0]).toBeCloseTo(3);
    expect(values[1]).toBeCloseTo(1);
    expect(values[2]).toBeCloseTo(0.5);
    expect(vectors[0]?.[0]).toBeCloseTo(Math.SQRT1_2);
    expect(vectors[0]?.[1]).toBeCloseTo(Math.SQRT1_2);
  });

  it("a shadow keeps everything but the spread along the light", () => {
    const matrix = covariance(CLOUD);
    const total = 2 + 0.25 + 0.0625;
    // Light from the front (along z): it hides only the thin z spread.
    expect(shadowShare(matrix, [0, 0, 1])).toBeCloseTo(1 - 0.0625 / total);
    // Light along x, the longest way: it hides most of the shape.
    expect(shadowShare(matrix, [1, 0, 0])).toBeCloseTo(1 - 2 / total);
  });

  it("the best shadow lights the cloud along its thinnest side", () => {
    const { turn, tip } = bestShadow(covariance(CLOUD));
    const direction = viewDirection(turn, tip);
    expect(Math.abs(direction[2])).toBeCloseTo(1);
  });

  it("turning and tipping round-trip through angles", () => {
    const angles = anglesOf(viewDirection(0.7, -0.3));
    expect(angles.turn).toBeCloseTo(0.7);
    expect(angles.tip).toBeCloseTo(-0.3);
  });

  it("the shadow from the front is x across and y up", () => {
    expect(shadowOf([[1, 2, 3]], 0, 0)).toEqual([[1, 2]]);
  });
});
