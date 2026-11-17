import { buildRoad, lampPosts, roadSide } from "./svm";

// Hand-worked: group 0 at (−1, 0), group 1 at (1, 0) and (3, 0); flat road, strict enough.
// The widest road is the line x = 0 with edges at x = ±1: w = (1, 0), bias 0.
// Only the two inner dots hold it up: α = ½ each (w = ½·(1,0) − ½·(−1,0)); the far dot has α = 0.
const DOTS = [
  { x: -1, y: 0, label: 0 },
  { x: 1, y: 0, label: 1 },
  { x: 3, y: 0, label: 1 },
];

describe("buildRoad", () => {
  it("finds the hand-worked widest road and its two lamp posts", () => {
    const road = buildRoad(DOTS, { kernel: "flat", lift: 0, strict: 100, tolerance: 1e-6 });
    expect(road.settled).toBe(true);
    expect(road.alpha[0]).toBeCloseTo(0.5, 4);
    expect(road.alpha[1]).toBeCloseTo(0.5, 4);
    expect(road.alpha[2]).toBeCloseTo(0, 6);
    expect(lampPosts(road)).toEqual([0, 1]);
    const side = roadSide(road);
    expect(side(0, 0)).toBeCloseTo(0, 4);
    expect(side(0.5, 0.7)).toBeCloseTo(0.5, 4);
    expect(side(-1, 0)).toBeCloseTo(-1, 4);
  });

  it("pulling up a dot that is not a lamp post leaves the road where it was", () => {
    const options = { kernel: "flat" as const, lift: 0, strict: 100, tolerance: 1e-6 };
    const before = roadSide(buildRoad(DOTS, options));
    const after = roadSide(buildRoad(DOTS.slice(0, 2), options));
    for (const x of [-0.8, 0.1, 0.9]) expect(after(x, 0.3)).toBeCloseTo(before(x, 0.3), 4);
  });

  it("a bowl lift splits a ring from its middle", () => {
    const middle = [0, 1, 2, 3].map((at) => ({
      x: 0.2 * Math.cos(at * 1.6),
      y: 0.2 * Math.sin(at * 1.6),
      label: 0,
    }));
    const ring = [0, 1, 2, 3, 4, 5].map((at) => ({
      x: 0.8 * Math.cos(at),
      y: 0.8 * Math.sin(at),
      label: 1,
    }));
    const road = buildRoad([...middle, ...ring], { kernel: "bowl", lift: 2, strict: 10 });
    const side = roadSide(road);
    expect(side(0, 0)).toBeLessThan(0);
    expect(side(0.8, 0)).toBeGreaterThan(0);
    expect(side(-0.8, 0)).toBeGreaterThan(0);
    // Flat, no road can do it: some dot ends on the wrong side.
    const flat = roadSide(buildRoad([...middle, ...ring], { kernel: "flat", lift: 0, strict: 10 }));
    const wrong = [...middle, ...ring].filter(
      (dot) => flat(dot.x, dot.y) > 0 !== (dot.label === 1),
    );
    expect(wrong.length).toBeGreaterThan(0);
  });

  it("a lenient road lets dots in; every pull stays between zero and the strictness", () => {
    const road = buildRoad(DOTS, { kernel: "bumps", lift: 3, strict: 0.1 });
    for (const value of road.alpha) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0.1 + 1e-12);
    }
  });

  it("is the same every time", () => {
    const options = { kernel: "bumps" as const, lift: 2, strict: 1 };
    expect(buildRoad(DOTS, options)).toEqual(buildRoad(DOTS, options));
  });
});
