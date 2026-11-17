import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { freshTrend, type RelayFrame, type RelayState } from "./model";

export const predictions = [
  {
    id: "many-runners-new-nests",
    question: predictionWords.question,
    choices: [
      { id: "rises", label: predictionWords.rises },
      { id: "falls", label: predictionWords.falls },
      { id: "same", label: predictionWords.same },
    ],
    answer: (state) => freshTrend(state),
  },
] as const satisfies readonly [Prediction<RelayState, RelayFrame>];
