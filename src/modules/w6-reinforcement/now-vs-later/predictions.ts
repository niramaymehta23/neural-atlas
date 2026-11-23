import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { keyOf, RIGHT_NOW, type NowFrame, type NowState } from "./model";

export const predictions = [
  {
    id: "right-now",
    question: predictionWords.question,
    choices: [
      { id: "near", label: predictionWords.near },
      { id: "far", label: predictionWords.far },
    ],
    // Revealed once the telescope on screen reads "right now": where that plan heads.
    answer: (state, frame) =>
      state.care > 0 &&
      state.care < RIGHT_NOW &&
      frame?.key === keyOf(state) &&
      frame.destination !== "neither"
        ? frame.destination
        : null,
  },
] as const satisfies readonly [Prediction<NowState, NowFrame>];
