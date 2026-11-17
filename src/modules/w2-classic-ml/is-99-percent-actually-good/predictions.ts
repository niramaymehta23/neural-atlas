import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { lazyScore, type SortState } from "./model";

export const predictions = [
  {
    id: "lazy-sorter-score",
    question: predictionWords.question,
    choices: [
      { id: "fifty", label: predictionWords.fifty },
      { id: "ninety", label: predictionWords.ninety },
      { id: "ninetyNine", label: predictionWords.ninetyNine },
    ],
    // Told once the learner sets one wormy apple in a hundred and a sorter that keeps every apple.
    answer: (state) => lazyScore(state),
  },
] as const satisfies readonly [Prediction<SortState>];
