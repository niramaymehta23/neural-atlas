import { groupSteps, nearest, seedCentres } from "./kmeans";

// Hand-worked: four dots, two on each side at heights ±0.2. The numbers are in each test.
const DOTS = [
  { x: -1, y: 0.2 },
  { x: -1, y: -0.2 },
  { x: 1, y: 0.2 },
  { x: 1, y: -0.2 },
];

describe("k-means", () => {
  it("moves the magnets to the middles of their dots, step by hand-worked step", () => {
    const steps = groupSteps(
      DOTS,
      [
        { x: -1.5, y: 0 },
        { x: -0.5, y: 0 },
      ],
      10,
    );
    // Step 0: a left dot (−1, ±0.2) is 0.25 + 0.04 (squared) from (−1.5, 0) and the same from
    // (−0.5, 0): a tie, so the lower magnet. The right dots are nearer magnet 1.
    expect(steps[0]?.groups).toEqual([0, 0, 1, 1]);
    // Step 1: magnet 0 to (−1, 0), magnet 1 to (1, 0). Nobody changes group, so it stops.
    expect(steps[1]?.centres).toEqual([
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(steps).toHaveLength(2);
    // Spread: every dot is 0.2 from its magnet → 0.04.
    expect(steps[1]?.spread).toBeCloseTo(0.04);
  });

  it("a magnet with no dots stays where it is", () => {
    const steps = groupSteps(
      DOTS,
      [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
      5,
    );
    expect(steps.at(-1)?.centres[1]).toEqual({ x: 5, y: 5 });
  });

  it("seeded starts sit on dots and are the same every time", () => {
    const starts = seedCentres(DOTS, 2, 3);
    expect(starts).toEqual(seedCentres(DOTS, 2, 3));
    for (const start of starts) expect(DOTS).toContainEqual(start);
    // k-means++ never picks the same dot twice while others are farther away.
    expect(starts[0]).not.toEqual(starts[1]);
  });

  it("assigns ties to the lower magnet", () => {
    expect(
      nearest(
        [{ x: 0, y: 0 }],
        [
          { x: -1, y: 0 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual([0]);
  });
});
