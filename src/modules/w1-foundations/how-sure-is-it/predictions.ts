import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { borderSureness, UNSURE, type SureState } from "./model";

export const predictions = [
  {
    id: "border-sureness",
    question: predictionWords.question,
    choices: [
      { id: "sure", label: predictionWords.sure },
      { id: "unsure", label: predictionWords.unsure },
    ],
    // Told at the usual boasting (never by the dial being turned), once the glass has been used.
    answer: (state) =>
      state.looked ? (borderSureness(state.overlap) < UNSURE ? "unsure" : "sure") : null,
  },
] as const satisfies readonly [Prediction<SureState>];
