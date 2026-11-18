import { GUESSING, LONG, REMEMBERS } from "@/features/memory/run";
import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, type ReadingFrame, type ReadingState } from "./model";

export const predictions = [
  {
    id: "long-sentences",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished run on long sentences that clearly remembers or clearly guesses.
    answer: (state, frame) =>
      !isFinished(state, frame) || state.length < LONG
        ? null
        : frame.right > REMEMBERS
          ? "yes"
          : frame.right < GUESSING
            ? "no"
            : null,
    fresh: true,
  },
] as const satisfies readonly [Prediction<ReadingState, ReadingFrame>];
