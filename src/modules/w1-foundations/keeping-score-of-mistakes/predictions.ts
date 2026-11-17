import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import {
  hardestPull,
  isFinished,
  power,
  rareCount,
  STRICT_POWER,
  type ScoreFrame,
  type ScoreState,
} from "./model";

export const predictions = [
  {
    id: "hardest-pull",
    question: predictionWords.question,
    choices: [
      { id: "far", label: predictionWords.far },
      { id: "near", label: predictionWords.near },
    ],
    // Told by a finished walk under a strict scorer with some far-off dots: which group pulls
    // harder, dot for dot, where the line settled.
    answer: (state, frame) => {
      if (!isFinished(state, frame) || power(state.strict) < STRICT_POWER) return null;
      if (rareCount(state.rare) === 0) return null;
      return hardestPull(state, frame);
    },
    fresh: true,
  },
] as const satisfies readonly [Prediction<ScoreState, ScoreFrame>];
