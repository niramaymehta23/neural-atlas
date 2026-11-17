import { vote } from "./knn";

// Five dots on a line, hand-worked distances from the spot (0, 0):
//   #0 (0.1, 0) group 0 → 0.1    #1 (−0.2, 0) group 1 → 0.2    #2 (0.3, 0) group 1 → 0.3
//   #3 (0, 0.4) group 0 → 0.4    #4 (0, −0.5) group 0 → 0.5
const DOTS = [
  { x: 0.1, y: 0, label: 0 },
  { x: -0.2, y: 0, label: 1 },
  { x: 0.3, y: 0, label: 1 },
  { x: 0, y: 0.4, label: 0 },
  { x: 0, y: -0.5, label: 0 },
];

describe("vote", () => {
  it("asks the k nearest, nearest first", () => {
    const result = vote(DOTS, 0, 0, 3);
    expect(result.neighbours.map((near) => near.index)).toEqual([0, 1, 2]);
    [0.1, 0.2, 0.3].forEach((distance, at) =>
      expect(result.neighbours[at]?.distance).toBeCloseTo(distance),
    );
    // One vote each: group 0 has one, group 1 has two.
    expect(result.votes).toEqual([1, 2]);
    expect(result.winner).toBe(1);
  });

  it("one neighbour decides alone", () => {
    expect(vote(DOTS, 0, 0, 1).winner).toBe(0);
  });

  it("five neighbours: three to two for group 0", () => {
    expect(vote(DOTS, 0, 0, 5).votes).toEqual([3, 2]);
  });

  it("a tie goes to the nearest tied voter's group", () => {
    // k = 2: one each; the nearest (#0) is group 0.
    expect(vote(DOTS, 0, 0, 2).winner).toBe(0);
  });

  it("closer voices count more", () => {
    // k = 3, closeness 1: weights 1/d² = 100, 25, 11.1 → group 0 has 100, group 1 has 36.1.
    const result = vote(DOTS, 0, 0, 3, 1);
    expect(result.votes[0]).toBeCloseTo(100);
    expect(result.votes[1]).toBeCloseTo(25 + 100 / 9);
    expect(result.winner).toBe(0);
  });

  it("is the same every time", () => {
    expect(vote(DOTS, 0.05, -0.1, 4, 0.5)).toEqual(vote(DOTS, 0.05, -0.1, 4, 0.5));
  });
});
