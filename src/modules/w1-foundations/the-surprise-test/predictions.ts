import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { closerScore, isFinished, type SurpriseFrame, type SurpriseState } from "./model";

export const predictions = [
  {
    id: "closest-score",
    question: predictionWords.question,
    choices: [
      { id: "practice", label: predictionWords.practice },
      { id: "surprise", label: predictionWords.surprise },
    ],
    // Told by a finished, honest practice (no peeking), once the brand-new dots are tried.
    answer: (state, frame) =>
      state.peek || !state.fresh || !isFinished(state, frame) ? null : closerScore(frame),
    fresh: true,
  },
] as const satisfies readonly [Prediction<SurpriseState, SurpriseFrame>];
