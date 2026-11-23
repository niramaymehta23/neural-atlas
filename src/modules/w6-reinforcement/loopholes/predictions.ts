import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, type LoopholeFrame, type LoopholeState } from "./model";

export const predictions = [
  {
    id: "pickup-treat",
    question: predictionWords.question,
    choices: [
      { id: "faster", label: predictionWords.faster },
      { id: "trick", label: predictionWords.trick },
    ],
    // Told by a finished day with the pick-up treat switched on.
    answer: (state, frame) =>
      !state.pickup || !isFinished(state, frame)
        ? null
        : frame.behaviour === "juggles"
          ? "trick"
          : "faster",
    fresh: true,
  },
] as const satisfies readonly [Prediction<LoopholeState, LoopholeFrame>];
