import { curveAt, fitCurve, leastSquares, solve } from "./least-squares";

describe("least squares", () => {
  it("solves a small system exactly", () => {
    const x = solve(
      [
        [2, 1, -1],
        [-3, -1, 2],
        [-2, 1, 2],
      ],
      [8, -11, -3],
    );
    expect(x.map((value) => Math.round(value * 1e9) / 1e9)).toEqual([2, 3, -1]);
  });

  it("finds the line through points that lie on one", () => {
    const points = [-1, -0.5, 0, 0.5, 1].map((x) => ({ x, y: 0.3 + 2 * x }));
    const [height, tilt] = fitCurve(points, 1);
    expect(height).toBeCloseTo(0.3, 6);
    expect(tilt).toBeCloseTo(2, 6);
  });

  it("matches the textbook straight line for scattered points", () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 5 },
    ];
    // Slope = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)² = 5.5 / 5; intercept = ȳ − slope·x̄.
    const [height, tilt] = fitCurve(points, 1);
    expect(tilt).toBeCloseTo(1.1, 6);
    expect(height).toBeCloseTo(2.75 - 1.1 * 1.5, 6);
  });

  it("copes with a fact that never changes (no division by zero)", () => {
    const weights = leastSquares(
      [
        [1, 0, 2],
        [1, 0, 3],
        [1, 0, 4],
      ],
      [5, 7, 9],
      1e-6,
    );
    expect(weights.every(Number.isFinite)).toBe(true);
    expect(weights[0]! + weights[2]! * 3).toBeCloseTo(7, 3);
  });

  it("a curve with as many bends as points goes through every point", () => {
    const points = [-0.8, -0.3, 0.1, 0.6].map((x) => ({ x, y: Math.sin(3 * x) }));
    const weights = fitCurve(points, 3);
    for (const { x, y } of points) expect(curveAt(weights, x)).toBeCloseTo(y, 5);
  });
});
