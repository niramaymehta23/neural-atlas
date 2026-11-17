import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { pulledPost, roadMoved, type RoadState } from "./model";

export const predictions = [
  {
    id: "pull-a-plain-home",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Only a home that was not a lamp post answers it, by comparing the road with and without it.
    answer: (state) => {
      if (pulledPost(state) !== false) return null;
      const moved = roadMoved(state);
      return moved === null ? null : moved ? "yes" : "no";
    },
  },
] as const satisfies readonly [Prediction<RoadState>];
