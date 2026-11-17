import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isSingleCell, isThisRun, type CellsFrame, type CellsState } from "./model";

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
    // Only the ring planted as it is, with one cell, after enough practice on this very run.
    answer: (state, frame) =>
      !isThisRun(state, frame) ||
      !isSingleCell(state) ||
      state.garden !== "ring" ||
      state.points.length < 150 ||
      frame.epoch < ENOUGH_PRACTICE
        ? null
        : frame.loss < FENCED
          ? "yes"
          : "no",
  },
] as const satisfies readonly [Prediction<CellsState, CellsFrame>];
