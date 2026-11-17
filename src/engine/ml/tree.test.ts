import { createRandom } from "../random";
import { cuts, featureChooser, growTree, leafAt, leafCount, questions } from "./tree";

// Four dots, hand-worked. Group 0 on the left (x = −0.6, −0.4), group 1 on the right (x = 0.2, 0.6),
// all with y mixed. Cutting x at −0.1 (halfway between −0.4 and 0.2) leaves two pure boxes:
// Gini 0, the best possible; any cut on y leaves a mixed box.
const DOTS = [
  { x: -0.6, y: 0.5, label: 0 },
  { x: -0.4, y: -0.5, label: 0 },
  { x: 0.2, y: 0.4, label: 1 },
  { x: 0.6, y: -0.3, label: 1 },
];

describe("growTree", () => {
  it("asks the one question that splits the groups cleanly", () => {
    const tree = growTree(DOTS, { depth: 3 });
    expect(tree.kind).toBe("split");
    if (tree.kind !== "split") return;
    expect(tree.feature).toBe(0);
    expect(tree.threshold).toBeCloseTo(-0.1);
    expect(leafCount(tree)).toBe(2);
    expect(leafAt(tree, -0.9, 0).shares).toEqual([1, 0]);
    expect(leafAt(tree, 0.9, 0).shares).toEqual([0, 1]);
  });

  it("with no questions allowed, it guesses from the whole garden", () => {
    const tree = growTree([...DOTS, { x: 0.9, y: 0.9, label: 1 }], { depth: 0 });
    expect(tree).toEqual({ kind: "leaf", shares: [0.4, 0.6], count: 5 });
  });

  it("an XOR needs two levels: one question cannot help, so it stops", () => {
    // Groups on the diagonals: every single cut leaves both boxes half and half (Gini stays 0.5).
    const xor = [
      { x: -0.5, y: -0.5, label: 0 },
      { x: 0.5, y: 0.5, label: 0 },
      { x: -0.5, y: 0.5, label: 1 },
      { x: 0.5, y: -0.5, label: 1 },
    ];
    expect(growTree(xor, { depth: 4 }).kind).toBe("leaf");
  });

  it("respects the smallest box", () => {
    // Cutting −0.1 leaves two dots per box; with at least three per box nothing may be asked.
    expect(growTree(DOTS, { depth: 3, minLeaf: 3 }).kind).toBe("leaf");
  });

  it("draws each question as a cut across its own box", () => {
    const three = [...DOTS, { x: 0.3, y: 0.9, label: 0 }];
    const tree = growTree(three, { depth: 2 });
    expect(questions(tree).length).toBe(cuts(tree).length);
    for (const cut of cuts(tree)) {
      expect(cut.from).toBeLessThan(cut.to);
      expect(Math.abs(cut.at)).toBeLessThanOrEqual(1);
    }
  });

  it("a seeded chooser gives the same tree twice", () => {
    const grow = () => growTree(DOTS, { depth: 3, features: featureChooser(createRandom(7), 0.5) });
    expect(grow()).toEqual(grow());
  });
});
