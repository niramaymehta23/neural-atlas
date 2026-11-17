import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { COPIED, isFinished, type CurveFrame, type CurveState } from "./model";

export const predictions = [
  {
    id: "straight-wave",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished run on the wave with no bend.
    answer: (state, frame) =>
      state.bend !== "identity" || state.shape !== "wave" || !isFinished(state, frame)
        ? null
        : frame.loss <= COPIED
          ? "yes"
          : "no",
    fresh: true,
  },
] as const satisfies readonly [Prediction<CurveState, CurveFrame>];
