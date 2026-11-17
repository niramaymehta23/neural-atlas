import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { edgeChange, type NeighboursState } from "./model";

export const predictions = [
  {
    id: "edge-with-many",
    question: predictionWords.question,
    choices: [
      { id: "smoother", label: predictionWords.smoother },
      { id: "jagged", label: predictionWords.jagged },
      { id: "same", label: predictionWords.same },
    ],
    // Worked out on the learner's own town: the edge when asking many against asking one.
    answer: (state) => edgeChange(state),
  },
] as const satisfies readonly [Prediction<NeighboursState>];
