import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { affordable, bestFor, type ScaleFrame, type ScaleState } from "./model";

/** Grown by at least this much (a power of ten) counts as growing. */
const GROWS = 0.3;
const START_BUDGET = 20;

export const predictions = [
  {
    id: "ten-times-computing",
    question: predictionWords.question,
    choices: [
      { id: "brain", label: predictionWords.brain },
      { id: "reading", label: predictionWords.reading },
      { id: "both", label: predictionWords.both },
    ],
    // Told once the computing dial is turned up ten times or more: compares the best plans.
    answer: (_state, frame) => {
      if (!frame || frame.budget < START_BUDGET + 1) return null;
      const before = bestFor(frame.budget - 1);
      const after = bestFor(frame.budget);
      const brain = after.brain - before.brain >= GROWS;
      const reading =
        affordable(after.brain, frame.budget) - affordable(before.brain, frame.budget - 1) >= GROWS;
      return brain && reading ? "both" : brain ? "brain" : "reading";
    },
  },
] as const satisfies readonly [Prediction<ScaleState, ScaleFrame>];
