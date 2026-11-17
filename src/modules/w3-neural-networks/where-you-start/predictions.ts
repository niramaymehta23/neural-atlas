import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { allCopies, isFinished, type StartFrame, type StartState } from "./model";

export const predictions = [
  {
    id: "same-start-splits",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished spin that started every cell the same.
    answer: (state, frame) =>
      !state.same || !isFinished(state, frame)
        ? null
        : allCopies(state.cells, frame.params)
          ? "no"
          : "yes",
    fresh: true,
  },
] as const satisfies readonly [Prediction<StartState, StartFrame>];
