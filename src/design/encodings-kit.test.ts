import {
  classTone,
  extent,
  fullness,
  linePath,
  regionTone,
  tileTone,
  weightTone,
} from "./encodings";

describe("encodings added for the engines", () => {
  it("colours a connection by its sign", () => {
    expect(weightTone(0.4)).toBe("var(--color-good)");
    expect(weightTone(-0.4)).toBe("var(--color-bad)");
  });

  it("fills busier neurons more, within bounds", () => {
    expect(fullness(0)).toBeCloseTo(0.18);
    expect(fullness(0.5)).toBeGreaterThan(fullness(0.1));
    expect(fullness(9)).toBe(1);
  });

  it("gives groups calm tokens and tints regions by sureness", () => {
    expect(classTone(0)).toBe("var(--color-flow)");
    expect(classTone(3)).toBe(classTone(0));
    expect(regionTone(1, 0)).toBe("color-mix(in oklab, var(--color-good) 0%, var(--color-paper))");
    expect(regionTone(1, 1)).toContain("45%");
  });

  it("marks goal and trap squares as good and bad", () => {
    expect(tileTone("goal")).toBe("var(--color-good)");
    expect(tileTone("trap")).toBe("var(--color-bad)");
  });

  it("draws a line with higher values higher up, on a shared scale when asked", () => {
    expect(linePath([0, 1], 10, 4)).toBe("M0.00 4.00 L10.00 0.00");
    expect(linePath([1, 1], 10, 4, { min: 0, max: 2 })).toBe("M0.00 2.00 L10.00 2.00");
    expect(linePath([], 10, 4)).toBe("");
    expect(extent([3, Number.NaN, -1])).toEqual({ min: -1, max: 3 });
  });
});
