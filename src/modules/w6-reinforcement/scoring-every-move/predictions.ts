import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { besideTrap, plannedPath, type ScoringFrame, type ScoringState } from "./model";

/** Tries before its plan counts as learned. */
const LEARNED = 150;

export const predictions = [
  {
    id: "edge-or-safe",
    question: predictionWords.question,
    choices: [
      { id: "edge", label: predictionWords.edge },
      { id: "safe", label: predictionWords.safe },
    ],
    answer: (_state, frame) => {
      if (!frame || frame.epoch < LEARNED) return null;
      const path = plannedPath(frame);
      if (path.length === 0) return null;
      return path.some((cell) => besideTrap(frame.tiles, cell)) ? "edge" : "safe";
    },
  },
] as const satisfies readonly [Prediction<ScoringState, ScoringFrame>];
