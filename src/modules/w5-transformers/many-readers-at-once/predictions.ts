import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { DIFFERENT, type ReadersFrame, type ReadersState } from "./model";

export const predictions = [
  {
    id: "same-or-different",
    question: predictionWords.question,
    choices: [
      { id: "same", label: predictionWords.same },
      { id: "different", label: predictionWords.different },
    ],
    // Measured on the real reading on screen: how many different words the twelve readers look
    // hardest at, for each word, whichever readers are switched off.
    answer: (_state, frame) =>
      frame === undefined || frame.words < 2
        ? null
        : frame.spread >= DIFFERENT
          ? "different"
          : "same",
  },
] as const satisfies readonly [Prediction<ReadersState, ReadersFrame>];
