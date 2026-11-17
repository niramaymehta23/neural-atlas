// @vitest-environment node
import { createRandom } from "../random";
import { affinities, createMap, gradient, spacing } from "./tsne";

const cloud = (n: number, dims: number, seed: number) => {
  const random = createRandom(seed);
  return Float64Array.from({ length: n * dims }, () => random.normal());
};

describe("t-SNE", () => {
  it("equally distant neighbours share the chances evenly", () => {
    // Hand-worked: three corners of an equilateral triangle; with perplexity 2 each thing's two
    // neighbours get ½ each, so every symmetric pair is (½ + ½) / (2 × 3) = 1/6.
    const triangle = Float64Array.from([0, 0, 1, 0, 0.5, Math.sqrt(3) / 2]);
    const p = affinities(triangle, 2, 2);
    expect(Array.from(p.values)).toEqual(
      [1 / 6, 1 / 6, 1 / 6].map((value) => expect.closeTo(value, 6)),
    );
    expect(p.values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0.5);
  });

  it("the gradient matches the cost's slope, worked out by nudging each spot", () => {
    const p = affinities(cloud(6, 3, 2), 3, 1.5);
    const y = cloud(6, 2, 5);
    const grad = new Float64Array(12);
    gradient(p, y, 1, grad);
    const scratch = new Float64Array(12);
    // The full KL counts both orders of each pair; gradient() returns it.
    const cost = (at: Float64Array) => gradient(p, at, 1, scratch);
    for (let index = 0; index < 12; index += 1) {
      const up = Float64Array.from(y);
      const down = Float64Array.from(y);
      up[index] = (up[index] ?? 0) + 1e-6;
      down[index] = (down[index] ?? 0) - 1e-6;
      expect(grad[index]).toBeCloseTo((cost(up) - cost(down)) / 2e-6, 4);
    }
  });

  it("the same seed lands every thing in the same spot, however the steps are taken", () => {
    const data = cloud(40, 5, 1);
    const one = createMap(data, 5, { perplexity: 8, seed: 3 });
    const two = createMap(data, 5, { perplexity: 8, seed: 3 });
    for (let step = 0; step < 30; step += 1) one.advance();
    for (let step = 0; step < 10; step += 1) two.advance();
    for (let step = 0; step < 20; step += 1) two.advance();
    expect(Array.from(two.positions)).toEqual(Array.from(one.positions));
    expect(two.cost).toBe(one.cost);
  });

  it("separate groups settle into separate islands", () => {
    // Two far-apart groups of twenty in five dimensions.
    const random = createRandom(4);
    const data = Float64Array.from(
      { length: 40 * 5 },
      (_, at) => random.normal() * 0.3 + (Math.floor(at / 5) % 2 === 0 ? 0 : 6),
    );
    const map = createMap(data, 5, { perplexity: 6, seed: 1 });
    for (let step = 0; step < 400; step += 1) map.advance();
    const centre = (group: number) => {
      let x = 0;
      let y = 0;
      for (let i = group; i < 40; i += 2) {
        x += map.positions[2 * i] ?? 0;
        y += map.positions[2 * i + 1] ?? 0;
      }
      return [x / 20, y / 20] as const;
    };
    const spread = (group: number) => {
      const [cx, cy] = centre(group);
      let total = 0;
      for (let i = group; i < 40; i += 2)
        total += Math.hypot((map.positions[2 * i] ?? 0) - cx, (map.positions[2 * i + 1] ?? 0) - cy);
      return total / 20;
    };
    const [ax, ay] = centre(0);
    const [bx, by] = centre(1);
    expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(3 * Math.max(spread(0), spread(1)));
  });

  it("an even grid is spread out; the same dots squeezed into two far clumps are not", () => {
    // A 10 × 10 grid: every nearest neighbour is 1 away, about twice a random scatter's spacing.
    const grid = Float64Array.from({ length: 200 }, (_, at) =>
      at % 2 === 0 ? Math.floor(at / 2) % 10 : Math.floor(at / 20),
    );
    expect(spacing(grid)).toBeGreaterThan(1.5);
    const clumps = Float64Array.from(
      { length: 200 },
      (_, at) => (grid[at] ?? 0) * 0.02 + (at < 100 ? 0 : 50),
    );
    expect(spacing(clumps)).toBeLessThan(0.3);
  });
});
