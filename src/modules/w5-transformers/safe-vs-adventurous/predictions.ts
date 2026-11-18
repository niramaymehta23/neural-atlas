import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { SamplingFrame, SamplingState } from "./model";

export const predictions = [
  {
    id: "boring-same",
    question: predictionWords.question,
    choices: [
      { id: "same", label: predictionWords.same },
      { id: "different", label: predictionWords.different },
    ],
    // Told once a boring story is on screen: it is written with three different rolls.
    answer: (_state, frame) =>
      frame === undefined || !frame.known || frame.heat > 0
        ? null
        : frame.sameEachTime
          ? "same"
          : "different",
  },
] as const satisfies readonly [Prediction<SamplingState, SamplingFrame>];
