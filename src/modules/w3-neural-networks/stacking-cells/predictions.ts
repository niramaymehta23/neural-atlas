import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isSingleCell, type CellsFrame, type CellsState } from "./model";

/** Practice before the answer can be told, and the mistakes that count as fenced in. */
const ENOUGH_PRACTICE = 100;
const FENCED = 0.3;

export const predictions = [
  {
    id: "one-cell-ring",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    answer: (state, frame) =>
      !isSingleCell(state) || state.garden !== "ring" || !frame || frame.epoch < ENOUGH_PRACTICE
        ? null
        : frame.loss < FENCED
          ? "yes"
          : "no",
  },
] as const satisfies readonly [Prediction<CellsState, CellsFrame>];
