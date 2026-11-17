import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { allHuge, isFinished, planEnding, type PlanFrame, type PlanState } from "./model";

export const predictions = [
  {
    id: "huge-settles",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished walk whose every part is a huge step.
    answer: (state, frame) =>
      !allHuge(state.plan) || !isFinished(state, frame)
        ? null
        : planEnding(state.plan) === "settled"
          ? "yes"
          : "no",
    fresh: true,
  },
] as const satisfies readonly [Prediction<PlanState, PlanFrame>];
