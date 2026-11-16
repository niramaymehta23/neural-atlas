import { speed, thickness, warmth } from "./encodings";

describe("encodings", () => {
  it("draws stronger connections thicker, within bounds", () => {
    expect(thickness(0)).toBe(1);
    expect(thickness(0.5)).toBeGreaterThan(thickness(0.2));
    expect(thickness(1)).toBe(8);
    expect(thickness(5)).toBe(8);
    expect(thickness(Number.NaN)).toBe(1);
  });

  it("warms bigger mistakes towards rose", () => {
    expect(warmth(0)).toBe("color-mix(in oklab, var(--color-bad) 0%, var(--color-flow))");
    expect(warmth(0.75)).toContain("var(--color-bad) 75%");
    expect(warmth(-1)).toContain("var(--color-bad) 0%");
  });

  it("moves busier paths faster", () => {
    expect(speed(1)).toBeLessThan(speed(0));
    expect(speed(0)).toBeCloseTo(2.4);
    expect(speed(2)).toBeCloseTo(0.4);
  });
});
