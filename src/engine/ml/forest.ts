import { createRandom } from "../random";
import { featureChooser, growTree, treeClassifier, type TreeNode } from "./tree";
import type { Dot } from "./types";

export type ForestOptions = {
  trees: number;
  depth: number;
  /**
   * 0: every tree sees every dot and both features, so all trees are the same. Above 0, each tree
   * learns from a seeded resample of the dots (drawn with replacement) and each question may look at
   * only one random feature with this chance.
   */
  variety: number;
  seed: number;
  minLeaf?: number;
  groups?: number;
};

/** A crowd of little trees (a random forest). */
export function growForest(dots: readonly Dot[], options: ForestOptions): TreeNode[] {
  const { trees, depth, variety, seed, minLeaf = 1, groups = 2 } = options;
  const random = createRandom(seed);
  return Array.from({ length: Math.max(0, Math.floor(trees)) }, () => {
    const sample =
      variety > 0 && dots.length > 0
        ? Array.from({ length: dots.length }, () => dots[random.int(dots.length)] as Dot)
        : dots;
    return growTree(sample, {
      depth,
      minLeaf,
      groups,
      features: featureChooser(random, variety),
    });
  });
}

/** The crowd's answer: each group's share of the trees' averaged opinions. */
export function forestClassifier(forest: readonly TreeNode[], groups = 2) {
  const each = forest.map(treeClassifier);
  return (x: number, y: number): number[] => {
    const total = Array.from({ length: groups }, () => 0);
    for (const classify of each) {
      const shares = classify(x, y);
      for (let group = 0; group < groups; group += 1)
        total[group] = (total[group] ?? 0) + (shares[group] ?? 0);
    }
    return total.map((value) => (each.length ? value / each.length : 1 / groups));
  };
}
