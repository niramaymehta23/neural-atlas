import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { COPIES, gainOf, isFinished, type RaceFrame, type RaceState } from "./model";

export const predictions = [
  {
    id: "exact-copies",
    question: predictionWords.question,
    choices: [
      { id: "better", label: predictionWords.better },
      { id: "same", label: predictionWords.same },
    ],
    // Told by finished races whose children were exact copies of their parents.
    answer: (state, frame) =>
      state.change >= COPIES || !isFinished(state, frame)
        ? null
        : gainOf(frame) > 0
          ? "better"
          : "same",
    fresh: true,
  },
] as const satisfies readonly [Prediction<RaceState, RaceFrame>];
