import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { crowdOrClever, type CrowdState } from "./model";

export const predictions = [
  {
    id: "crowd-or-clever",
    question: predictionWords.question,
    choices: [
      { id: "crowd", label: predictionWords.crowd },
      { id: "clever", label: predictionWords.clever },
      { id: "same", label: predictionWords.same },
    ],
    answer: (state) => crowdOrClever(state),
  },
] as const satisfies readonly [Prediction<CrowdState>];
