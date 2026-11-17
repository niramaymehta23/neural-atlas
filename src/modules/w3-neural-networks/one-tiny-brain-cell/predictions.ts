import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { EXAMPLE, INITIAL, score, type CellFrame, type CellState } from "./model";

export const predictions = [
  {
    id: "weekend-without-sun",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Always about the cell as it first appears, never the learner's own, so the dials can't move
    // the answer; it waits until the learner has tried something.
    answer: (state) => (state.changes === 0 ? null : score(INITIAL, EXAMPLE) > 0 ? "yes" : "no"),
  },
] as const satisfies readonly [Prediction<CellState, CellFrame>];
