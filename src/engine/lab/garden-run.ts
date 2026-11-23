/**
 * Any classic learner or small team, learning a garden of two kinds of dots a step at a time, so
 * every one of them can be watched the same way. A step is whatever that learner does next: a
 * round of practice, a few more dots remembered, one more question, one more tree.
 */
import {
  createTrainer,
  chance,
  paramCount,
  predict,
  startParams,
  type DenseSpec,
} from "../autodiff/dense";
import { relayClassifier, runRelay } from "../ml/boost";
import { fieldOf } from "../ml/field";
import { forestClassifier, growForest } from "../ml/forest";
import { knnClassifier } from "../ml/knn";
import { buildRoad, roadClassifier } from "../ml/svm";
import { growTree, treeClassifier } from "../ml/tree";
import type { Classifier, Dot } from "../ml/types";
import { counting } from "../multiplications";
import type { PracticeRun } from "../practice/protocol";
import { judge } from "./field";

export const GARDEN_MODELS = [
  "line",
  "team",
  "bigTeam",
  "neighbours",
  "questions",
  "crowd",
  "relay",
  "road",
] as const;
export type GardenModel = (typeof GARDEN_MODELS)[number];

/** Layer sizes of the models that are networks. */
export const TEAM_SIZES: Partial<Record<GardenModel, readonly number[]>> = {
  line: [2, 1],
  team: [2, 5, 1],
  bigTeam: [2, 16, 16, 1],
};

/** Steps each model practises for; more would change nothing worth watching. */
export const GARDEN_STEPS: Record<GardenModel, number> = {
  line: 120,
  team: 200,
  bigTeam: 120,
  neighbours: 30,
  questions: 7,
  crowd: 40,
  relay: 60,
  road: 10,
};

export type GardenConfig = {
  kind: "garden";
  model: GardenModel;
  /** The dots it learns from, and the ones it is judged on (never learned from). */
  dots: readonly Dot[];
  fresh: readonly Dot[];
  /** The spots its opinion is painted at (x, y pairs). */
  spots: Float32Array;
  seed: number;
};

export type GardenMoment = {
  kind: "garden";
  step: number;
  /** Share of the fresh dots in their own group. */
  right: number;
  /** How far off it is on the dots it learns from, 0 (spot on) to 1. */
  off: number;
  /** Chance of group 1 at every field spot. */
  field: Float32Array;
  /** The weights, for the models that are networks. */
  params: Float64Array | null;
  /** Dots taken in so far, for the neighbours (who learn by remembering). */
  remembered: number;
  /** Multiplications spent learning so far. */
  times: number;
  /** Multiplications it takes to answer about one spot. */
  perAnswer: number;
};

export const networkClassifier =
  (spec: DenseSpec, params: ArrayLike<number>): Classifier =>
  (x, y) => {
    const one = chance(predict(spec, params, [x, y])[0] ?? 0);
    return [1 - one, one];
  };

const EVEN: Classifier = () => [0.5, 0.5];

type Learner = {
  learn(step: number): void;
  classify(): Classifier;
  params?: Float64Array;
  remembered?: (step: number) => number;
};

function network(sizes: readonly number[], config: GardenConfig): Learner {
  const spec: DenseSpec = { sizes, bends: ["tanh"], loss: "logistic" };
  const params = startParams(sizes, { seed: config.seed });
  const trainer = createTrainer(
    spec,
    params,
    {
      inputs: config.dots.flatMap((dot) => [dot.x, dot.y]),
      targets: config.dots.map((dot) => dot.label),
    },
    { optimiser: "adam", learningRate: 0.03, batchSize: 16, seed: config.seed },
  );
  return {
    learn: () => {
      trainer.round();
    },
    classify: () => networkClassifier(spec, params),
    params,
  };
}

function learnerFor(config: GardenConfig): Learner {
  const { model, dots, seed } = config;
  const sizes = TEAM_SIZES[model];
  if (sizes) return network(sizes, config);
  let classify: Classifier = EVEN;
  if (model === "neighbours") {
    const steps = GARDEN_STEPS.neighbours;
    const remembered = (step: number) =>
      step <= 0 ? 0 : Math.max(1, Math.round((dots.length * step) / steps));
    return {
      learn: (step) => {
        classify = knnClassifier(dots.slice(0, remembered(step)), 5, 0.5);
      },
      classify: () => classify,
      remembered,
    };
  }
  if (model === "questions")
    return {
      learn: (step) => {
        classify = treeClassifier(growTree(dots, { depth: step, minLeaf: 2 }));
      },
      classify: () => classify,
    };
  if (model === "crowd") {
    // Grown once (the same seed grows the same trees); a step lets one more of them vote.
    let trees: ReturnType<typeof growForest> | null = null;
    return {
      learn: (step) => {
        trees ??= growForest(dots, {
          trees: GARDEN_STEPS.crowd,
          depth: 6,
          variety: 1,
          seed,
          minLeaf: 2,
        });
        classify = forestClassifier(trees.slice(0, step));
      },
      classify: () => classify,
    };
  }
  if (model === "relay") {
    let relay: ReturnType<typeof runRelay> | null = null;
    return {
      learn: (step) => {
        relay ??= runRelay(dots, { runners: GARDEN_STEPS.relay, depth: 2, rate: 0.3, minLeaf: 2 });
        classify = relayClassifier(relay, step);
      },
      classify: () => classify,
    };
  }
  return {
    // Each step lets the search for the widest road settle twice as long.
    learn: (step) => {
      classify = roadClassifier(
        buildRoad(dots, { kernel: "bumps", lift: 4, strict: 4, maxSteps: 2 ** step }),
      );
    },
    classify: () => classify,
  };
}

export function createGardenRun(config: GardenConfig): PracticeRun<GardenMoment> {
  if (config.dots.length === 0) throw new Error("A learner needs dots to learn from.");
  const learner = learnerFor(config);
  let step = 0;
  let times = 0;
  return {
    get step() {
      return step;
    },
    advance() {
      step += 1;
      times += counting(() => learner.learn(step)).times;
    },
    moment() {
      const classify = learner.classify();
      return {
        kind: "garden",
        step,
        right: judge(classify, config.fresh).right,
        off: judge(classify, config.dots).off,
        field: fieldOf(classify, config.spots, 2),
        params: learner.params ? learner.params.slice() : null,
        remembered: learner.remembered?.(step) ?? 0,
        times,
        perAnswer: counting(() => classify(0, 0)).times,
      };
    },
    every: 1,
  };
}

/** How many weights a team has. */
export const teamWeights = (model: GardenModel) => paramCount(TEAM_SIZES[model] ?? []);
