import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import {
  BARELY,
  crazyDots,
  isFinished,
  moveFromAdded,
  type LineFrame,
  type LineState,
} from "./model";

export const predictions = [
  {
    id: "far-dot",
    question: predictionWords.question,
    choices: [
      { id: "barely", label: predictionWords.barely },
      { id: "tilt", label: predictionWords.tilt },
    ],
    // Told by a finished best line on dots that include a far-away one of the learner's.
    answer: (state, frame) => {
      if (!isFinished(state, frame) || crazyDots(state).length === 0) return null;
      return moveFromAdded(state, frame).moved < BARELY ? "barely" : "tilt";
    },
    fresh: true,
  },
] as const satisfies readonly [Prediction<LineState, LineFrame>];
