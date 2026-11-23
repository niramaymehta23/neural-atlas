import { multiplied } from "../multiplications";
import type { Random } from "../random";
import type { Dot } from "./types";

/** 0 asks about left–right (x), 1 about up–down (y). */
export type Feature = 0 | 1;

export type Leaf = { kind: "leaf"; shares: number[]; count: number };
export type Split = {
  kind: "split";
  feature: Feature;
  /** Spots with the feature at or below this go left (lower), the rest right (higher). */
  threshold: number;
  low: TreeNode;
  high: TreeNode;
  shares: number[];
  count: number;
};
export type TreeNode = Leaf | Split;

export type TreeOptions = {
  /** Most questions on any path (0 = a single leaf). */
  depth: number;
  /** The fewest dots a box may hold after a question. */
  minLeaf?: number;
  groups?: number;
  /**
   * Which features each question may look at; given, it is called once per question (a forest
   * passes a seeded choice here). Default: both.
   */
  features?: () => readonly Feature[];
};

/** Improvements smaller than this are rounding, not a better question. */
const BETTER = 1e-12;
const BOTH: readonly Feature[] = [0, 1];

const valueOf = (dot: Dot, feature: Feature) => (feature === 0 ? dot.x : dot.y);

function sharesOf(dots: readonly Dot[], groups: number): number[] {
  const counts = Array.from({ length: groups }, () => 0);
  for (const dot of dots) counts[dot.label] = (counts[dot.label] ?? 0) + 1;
  return counts.map((value) => (dots.length ? value / dots.length : 1 / groups));
}

/** Gini impurity of a box from its group counts. */
function gini(counts: readonly number[], total: number): number {
  if (total === 0) return 0;
  let sum = 0;
  multiplied(counts.length);
  for (const value of counts) sum += (value / total) ** 2;
  return 1 - sum;
}

type Best = { feature: Feature; threshold: number; impurity: number };

/**
 * The yes/no question that leaves the boxes purest (lowest weighted Gini), cutting halfway
 * between neighbouring values. Ties keep the first found: the lower feature, then the lower cut.
 */
function bestSplit(
  dots: readonly Dot[],
  features: readonly Feature[],
  minLeaf: number,
  groups: number,
): Best | null {
  const total = dots.length;
  const allCounts = Array.from({ length: groups }, () => 0);
  for (const dot of dots) allCounts[dot.label] = (allCounts[dot.label] ?? 0) + 1;
  let best: Best | null = null;
  const current = gini(allCounts, total);
  for (const feature of [...features].sort()) {
    const sorted = [...dots].sort((a, b) => valueOf(a, feature) - valueOf(b, feature));
    const low = Array.from({ length: groups }, () => 0);
    for (let at = 0; at < total - 1; at += 1) {
      const dot = sorted[at] as Dot;
      low[dot.label] = (low[dot.label] ?? 0) + 1;
      const here = valueOf(dot, feature);
      const next = valueOf(sorted[at + 1] as Dot, feature);
      const lowCount = at + 1;
      if (next === here || lowCount < minLeaf || total - lowCount < minLeaf) continue;
      // Each side's impurity, weighted by its size.
      multiplied(2);
      const high = allCounts.map((value, group) => value - (low[group] ?? 0));
      const impurity =
        (lowCount * gini(low, lowCount) + (total - lowCount) * gini(high, total - lowCount)) /
        total;
      if (impurity < current - BETTER && (!best || impurity < best.impurity - BETTER))
        best = { feature, threshold: (here + next) / 2, impurity };
    }
  }
  return best;
}

/** Grows a yes/no question tree (CART with Gini impurity). */
export function growTree(dots: readonly Dot[], options: TreeOptions): TreeNode {
  const { depth, minLeaf = 1, groups = 2, features } = options;
  const grow = (box: readonly Dot[], left: number): TreeNode => {
    const shares = sharesOf(box, groups);
    const pure = shares.some((share) => share === 1);
    if (left <= 0 || pure || box.length < 2 * minLeaf)
      return { kind: "leaf", shares, count: box.length };
    const split = bestSplit(box, features?.() ?? BOTH, Math.max(1, minLeaf), groups);
    if (!split) return { kind: "leaf", shares, count: box.length };
    const low = box.filter((dot) => valueOf(dot, split.feature) <= split.threshold);
    const high = box.filter((dot) => valueOf(dot, split.feature) > split.threshold);
    return {
      kind: "split",
      feature: split.feature,
      threshold: split.threshold,
      low: grow(low, left - 1),
      high: grow(high, left - 1),
      shares,
      count: box.length,
    };
  };
  return grow(dots, Math.max(0, Math.floor(depth)));
}

/** The leaf a spot falls into. */
export function leafAt(tree: TreeNode, x: number, y: number): Leaf {
  let node = tree;
  while (node.kind === "split")
    node = (node.feature === 0 ? x : y) <= node.threshold ? node.low : node.high;
  return node;
}

export const treeClassifier = (tree: TreeNode) => (x: number, y: number) =>
  leafAt(tree, x, y).shares;

/** Every question in the tree, depth first (low side first), with how deep it sits. */
export function questions(tree: TreeNode): { split: Split; depth: number }[] {
  const found: { split: Split; depth: number }[] = [];
  const visit = (node: TreeNode, depth: number) => {
    if (node.kind !== "split") return;
    found.push({ split: node, depth });
    visit(node.low, depth + 1);
    visit(node.high, depth + 1);
  };
  visit(tree, 0);
  return found;
}

/** How many boxes (leaves) the tree cuts the map into. */
export function leafCount(tree: TreeNode): number {
  return tree.kind === "leaf" ? 1 : leafCount(tree.low) + leafCount(tree.high);
}

/** The box each question cuts, as limits on the −1…1 square, for drawing its line. */
export type Cut = { feature: Feature; at: number; from: number; to: number; depth: number };

export function cuts(tree: TreeNode): Cut[] {
  const found: Cut[] = [];
  const visit = (node: TreeNode, box: [number, number, number, number], depth: number) => {
    if (node.kind !== "split") return;
    const [left, right, bottom, top] = box;
    if (node.feature === 0) {
      found.push({ feature: 0, at: node.threshold, from: bottom, to: top, depth });
      visit(node.low, [left, node.threshold, bottom, top], depth + 1);
      visit(node.high, [node.threshold, right, bottom, top], depth + 1);
    } else {
      found.push({ feature: 1, at: node.threshold, from: left, to: right, depth });
      visit(node.low, [left, right, bottom, node.threshold], depth + 1);
      visit(node.high, [left, right, node.threshold, top], depth + 1);
    }
  };
  visit(tree, [-1, 1, -1, 1], 0);
  return found;
}

/** A seeded feature chooser: with chance `mix`, a question may only look at one random feature. */
export function featureChooser(random: Random, mix: number): () => readonly Feature[] {
  return () => (mix > 0 && random.next() < mix ? [random.int(2) as Feature] : BOTH);
}
