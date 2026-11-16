import { DATASETS, gridInputs, makeDataset, toSamples } from "./datasets";

describe("datasets", () => {
  it.each(DATASETS)("%s is seeded, sized, labelled and inside the square", (name) => {
    const points = makeDataset(name, { count: 120, seed: 4 });
    expect(points).toEqual(makeDataset(name, { count: 120, seed: 4 }));
    expect(points).not.toEqual(makeDataset(name, { count: 120, seed: 5 }));
    expect(points).toHaveLength(120);
    expect(new Set(points.map(({ label }) => label))).toEqual(new Set([0, 1]));
    for (const { x, y } of points) {
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
  });

  it("gives blobs and spiral a third group when asked", () => {
    for (const name of ["blobs", "spiral"] as const)
      expect(new Set(makeDataset(name, { classes: 3 }).map(({ label }) => label)).size).toBe(3);
    expect(new Set(makeDataset("moons", { classes: 3 }).map(({ label }) => label)).size).toBe(2);
  });

  it("shapes circles as an inner ring and an outer ring", () => {
    const radius = (label: number) =>
      makeDataset("circles", { noise: 0 })
        .filter((point) => point.label === label)
        .map(({ x, y }) => Math.hypot(x, y));
    expect(Math.max(...radius(0))).toBeLessThan(Math.min(...radius(1)));
  });

  it("turns points into flat training examples", () => {
    const samples = toSamples([
      { x: 0.5, y: -0.5, label: 1 },
      { x: -0.25, y: 0.75, label: 0 },
    ]);
    expect(samples.count).toBe(2);
    expect([...samples.inputs]).toEqual([0.5, -0.5, -0.25, 0.75]);
    expect([...samples.targets]).toEqual([1, 0]);
  });

  it("covers the square with grid centres, top row first", () => {
    const grid = gridInputs(2);
    expect([...grid]).toEqual([-0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5]);
  });
});
