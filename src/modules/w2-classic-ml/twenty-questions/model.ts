import { gridInputs, type Point } from "@/data/datasets";
import { fieldOf, rightShare } from "@/engine/ml/field";
import { growTree, leafCount, questions, treeClassifier, type TreeNode } from "@/engine/ml/tree";
import { GARDEN_NAMES, newDots, type GardenName } from "@/features/classic/garden";
import { rememberLast } from "@/features/classic/memo";

export const GARDENS = GARDEN_NAMES;
export const LIMITS = { depth: { min: 0, max: 10 }, smallest: { min: 1, max: 20 } };
export const FIELD = 48;
const GRID = gridInputs(FIELD);

export type QuestionsState = {
  garden: GardenName;
  points: Point[];
  brush: number;
  /** Most questions in a row. */
  depth: number;
  /** The fewest dots a box may hold. */
  smallest: number;
};

/** "Memorised every dot": every one of its own dots right, in at least this many boxes… */
export const MANY_BOXES = 10;
/** …from a garden this big, so it took real cramming. */
export const ENOUGH_DOTS = 30;
/** The guess is about asking this many questions in a row. */
export const LONG_ROW = 8;
/** A change smaller than this on new dots is no change. */
const NOTICEABLE = 0.02;

export const treeOf = rememberLast(
  (points: readonly Point[], depth: number, smallest: number): TreeNode =>
    growTree(points, { depth, minLeaf: smallest }),
);

export const fieldFor = rememberLast((tree: TreeNode) => fieldOf(treeClassifier(tree), GRID, 2));

export const freshFor = rememberLast((garden: GardenName) => newDots(garden));

export function scores(state: QuestionsState) {
  const tree = treeOf(state.points, state.depth, state.smallest);
  const fresh = freshFor(state.garden);
  return {
    tree,
    own: rightShare(treeClassifier(tree), state.points),
    fresh: fresh.length ? rightShare(treeClassifier(tree), fresh) : null,
    boxes: leafCount(tree),
    asked: questions(tree).length,
  };
}

/** Every dot right, many boxes, a real garden: it learned the dots by heart. */
export function memorised(state: QuestionsState): boolean {
  if (state.points.length < ENOUGH_DOTS) return false;
  const { own, boxes } = scores(state);
  return own === 1 && boxes >= MANY_BOXES;
}

/** How new dots fared as the row of questions grew from one to the dial's setting. */
export const freshByDepth = rememberLast(
  (points: readonly Point[], garden: GardenName, depth: number, smallest: number): number[] => {
    const fresh = freshFor(garden);
    return Array.from({ length: depth }, (_, at) =>
      rightShare(treeClassifier(growTree(points, { depth: at + 1, minLeaf: smallest })), fresh),
    );
  },
);

/** The guess's answer: what happened on new dots as more questions were allowed. */
export function longRowOutcome(state: QuestionsState): "better" | "worse" | "same" | null {
  if (state.depth < LONG_ROW || state.garden === "own" || state.points.length < ENOUGH_DOTS)
    return null;
  const curve = freshByDepth(state.points, state.garden, state.depth, state.smallest);
  const best = Math.max(...curve);
  const first = curve[0] ?? 0;
  const last = curve.at(-1) ?? 0;
  if (last < best - NOTICEABLE) return "worse";
  if (last > first + NOTICEABLE) return "better";
  return "same";
}
