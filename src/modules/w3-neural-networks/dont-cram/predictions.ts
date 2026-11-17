import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, switchingHelps, type CramFrame, type CramState } from "./model";

export const predictions = [
  {
    id: "switching-helps",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Revealed by a finished run with cells switched off; the answer is the lesson's own fixed
    // comparison, so it never moves with the dials.
    answer: (state, frame) =>
      state.off > 0 && isFinished(state, frame) ? (switchingHelps() ? "yes" : "no") : null,
  },
] as const satisfies readonly [Prediction<CramState, CramFrame>];
