import { growTree } from "./tree";
import { forestClassifier, growForest } from "./forest";

const DOTS = [
  { x: -0.6, y: 0.5, label: 0 },
  { x: -0.4, y: -0.5, label: 0 },
  { x: 0.2, y: 0.4, label: 1 },
  { x: 0.6, y: -0.3, label: 1 },
  { x: 0.1, y: -0.8, label: 0 },
];

describe("growForest", () => {
  it("with no variety every tree is the same plain tree", () => {
    const forest = growForest(DOTS, { trees: 4, depth: 3, variety: 0, seed: 1 });
    const plain = growTree(DOTS, { depth: 3 });
    for (const tree of forest) expect(tree).toEqual(plain);
  });

  it("averages the trees' opinions", () => {
    // Hand-made crowd: one tree says all group 0, one says all group 1 → half and half.
    const crowd = forestClassifier([
      { kind: "leaf", shares: [1, 0], count: 1 },
      { kind: "leaf", shares: [0, 1], count: 1 },
    ]);
    expect(crowd(0, 0)).toEqual([0.5, 0.5]);
  });

  it("with variety the trees differ, and the same seed grows the same forest", () => {
    const options = { trees: 6, depth: 3, variety: 1, seed: 9 };
    const forest = growForest(DOTS, options);
    expect(new Set(forest.map((tree) => JSON.stringify(tree))).size).toBeGreaterThan(1);
    expect(growForest(DOTS, options)).toEqual(forest);
  });
});
