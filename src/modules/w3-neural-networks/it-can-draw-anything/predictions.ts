import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { CELLS, CLOSE, isFinished, isReady, type DrawFrame, type DrawState } from "./model";

/** "A good long practice": the top half of the dial. */
const LONG = 0.5;

export const predictions = [
  {
    id: "twenty-zigzag",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished run of the most cells on the ready zigzag, practising a good while.
    answer: (state, frame) =>
      state.cells < CELLS.max ||
      state.practice < LONG ||
      !isReady(state.heights, "zigzag") ||
      !isFinished(state, frame)
        ? null
        : frame.loss <= CLOSE
          ? "yes"
          : "no",
    fresh: true,
  },
] as const satisfies readonly [Prediction<DrawState, DrawFrame>];
