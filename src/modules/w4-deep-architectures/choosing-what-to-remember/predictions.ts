import { GUESSING, LONG, REMEMBERS } from "@/features/memory/run";
import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, type GatesFrame, type GatesState } from "./model";

export const predictions = [
  {
    id: "gates-long-sentences",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished gated run on long sentences, with the gates as it learned them (the
    // learner's gate settings never change the answer).
    answer: (state, frame) =>
      !isFinished(state, frame) || state.cell !== "gated" || state.length < LONG
        ? null
        : frame.right > REMEMBERS
          ? "yes"
          : frame.right < GUESSING
            ? "no"
            : null,
    fresh: true,
  },
] as const satisfies readonly [Prediction<GatesState, GatesFrame>];
