import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isCurrent, NEW_FRUIT, type TeachFrame, type TeachState } from "./model";

/** Most of the new fruit right. */
const MOST = 0.7;

export const predictions = [
  {
    id: "robot-copies",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    answer: (state, frame) =>
      isCurrent(state, frame) ? (frame.right / NEW_FRUIT >= MOST ? "yes" : "no") : null,
    // A guess placed after watching a try is about the next try.
    fresh: true,
  },
] as const satisfies readonly [Prediction<TeachState, TeachFrame>];
