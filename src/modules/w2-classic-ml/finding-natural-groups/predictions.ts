import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { everyTime, type GroupsFrame, type GroupsState } from "./model";

export const predictions = [
  {
    id: "three-magnets-three-piles",
    question: predictionWords.question,
    choices: [
      { id: "always", label: predictionWords.always },
      { id: "sometimes", label: predictionWords.sometimes },
    ],
    // Worked out on the learner's own three piles, with twenty different drops.
    answer: (state) => everyTime(state),
  },
] as const satisfies readonly [Prediction<GroupsState, GroupsFrame>];
