import { createRandom } from "./random";

describe("createRandom", () => {
  it("repeats exactly for the same seed and differs for another", () => {
    const draw = (seed: number) => Array.from({ length: 5 }, createRandom(seed).next);
    expect(draw(7)).toEqual(draw(7));
    expect(draw(7)).not.toEqual(draw(8));
  });

  it("stays in range and centres its normals", () => {
    const random = createRandom(1);
    const uniforms = Array.from({ length: 2000 }, () => random.range(-2, 3));
    expect(Math.min(...uniforms)).toBeGreaterThanOrEqual(-2);
    expect(Math.max(...uniforms)).toBeLessThan(3);
    const normals = Array.from({ length: 5000 }, random.normal);
    const mean = normals.reduce((sum, value) => sum + value, 0) / normals.length;
    const spread = normals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / normals.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(spread).toBeCloseTo(1, 1);
    expect(new Set(Array.from({ length: 500 }, () => random.int(4)))).toEqual(
      new Set([0, 1, 2, 3]),
    );
  });
});
