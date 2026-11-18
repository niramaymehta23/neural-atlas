import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, isMush, type FogFrame, type FogState } from "./model";

export const predictions = [
  {
    id: "one-step",
    question: predictionWords.question,
    choices: [
      { id: "face", label: predictionWords.face },
      { id: "mush", label: predictionWords.mush },
    ],
    // Told by a finished one-step clearing.
    answer: (state, frame) =>
      state.cleanings !== 1 || !isFinished(state, frame) ? null : isMush(frame) ? "mush" : "face",
    fresh: true,
  },
] as const satisfies readonly [Prediction<FogState, FogFrame>];
