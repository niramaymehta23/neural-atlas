import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { DEEP, isFinished, signalsAtEnd, type SteadyFrame, type SteadyState } from "./model";

export const predictions = [
  {
    id: "deep-signals",
    question: predictionWords.question,
    choices: [
      { id: "change", label: predictionWords.change },
      { id: "lively", label: predictionWords.lively },
    ],
    // Told by a finished run of a deep stack without calming, from its signals at the end.
    answer: (state, frame) =>
      state.calm || state.layers < DEEP || !isFinished(state, frame)
        ? null
        : signalsAtEnd(state, frame.params) === "lively"
          ? "lively"
          : "change",
    fresh: true,
  },
] as const satisfies readonly [Prediction<SteadyState, SteadyFrame>];
