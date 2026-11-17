import { gridInputs, type Point } from "@/data/datasets";
import { fieldOf, rightShare } from "@/engine/ml/field";
import { forestClassifier, growForest } from "@/engine/ml/forest";
import { growTree, treeClassifier, type TreeNode } from "@/engine/ml/tree";
import { GARDEN_NAMES, newDots, type GardenName } from "@/features/classic/garden";
import { rememberLast } from "@/features/classic/memo";

export const GARDENS = GARDEN_NAMES;
export const LIMITS = { trees: { min: 1, max: 25 } };
/** Questions each little tree may ask in a row. */
export const TREE_DEPTH = 6;
/** The one clever tree the crowd is compared with asks this many. */
export const CLEVER_DEPTH = 10;
export const FIELD = 48;
/** Little trees drawn one by one beside the crowd. */
export const SHOWN_TREES = 6;
export const SMALL_FIELD = 24;
const GRID = gridInputs(FIELD);
const SMALL_GRID = gridInputs(SMALL_FIELD);

export type CrowdState = {
  garden: GardenName;
  points: Point[];
  brush: number;
  trees: number;
  /** 0: every tree learns from the same dots in the same way; 1: each from its own mix. */
  variety: number;
  /** Which forest: "Grow a new forest" picks another seed. */
  attempt: number;
};

/** "Every tree thinks the same": at least this many trees, and every one identical. */
export const SAME_CROWD = 3;
/** The guess is about a crowd this big… */
export const BIG_CROWD = 20;
/** …this varied. */
export const VARIED = 0.5;
const NOTICEABLE = 0.02;
const SEED = 21;

export const forestOf = rememberLast(
  (points: readonly Point[], trees: number, variety: number, attempt: number): TreeNode[] =>
    growForest(points, { trees, depth: TREE_DEPTH, variety, seed: SEED + attempt }),
);

export const crowdField = rememberLast((forest: readonly TreeNode[]) =>
  fieldOf(forestClassifier(forest), GRID, 2),
);

export const treeFields = rememberLast((forest: readonly TreeNode[]) =>
  forest.slice(0, SHOWN_TREES).map((tree) => fieldOf(treeClassifier(tree), SMALL_GRID, 2)),
);

const freshFor = rememberLast((garden: GardenName) => newDots(garden));

export const forestOfState = (state: CrowdState) =>
  forestOf(state.points, state.trees, state.variety, state.attempt);

export function crowdScores(state: CrowdState) {
  const forest = forestOfState(state);
  const fresh = freshFor(state.garden);
  const crowd = forestClassifier(forest);
  return {
    forest,
    own: rightShare(crowd, state.points),
    fresh: fresh.length ? rightShare(crowd, fresh) : null,
  };
}

/** True when every tree in the crowd is the same tree (so the crowd is no wiser than one). */
export function allTheSame(state: CrowdState): boolean {
  if (state.trees < SAME_CROWD || state.points.length === 0) return false;
  const forest = forestOfState(state);
  const first = JSON.stringify(forest[0]);
  return forest.every((tree) => JSON.stringify(tree) === first);
}

const cleverTree = rememberLast((points: readonly Point[]) =>
  growTree(points, { depth: CLEVER_DEPTH }),
);

/** The guess's answer: on new dots, the big varied crowd against one clever tree. */
export function crowdOrClever(state: CrowdState): "crowd" | "clever" | "same" | null {
  const fresh = freshFor(state.garden);
  if (state.trees < BIG_CROWD || state.variety < VARIED || fresh.length === 0) return null;
  const crowd = crowdScores(state).fresh ?? 0;
  const one = rightShare(treeClassifier(cleverTree(state.points)), fresh);
  return crowd > one + NOTICEABLE ? "crowd" : one > crowd + NOTICEABLE ? "clever" : "same";
}
