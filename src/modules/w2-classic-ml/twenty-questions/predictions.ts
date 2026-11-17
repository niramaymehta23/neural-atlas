import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { longRowOutcome, type QuestionsState } from "./model";

export const predictions = [
  {
    id: "more-questions-new-nests",
    question: predictionWords.question,
    choices: [
      { id: "better", label: predictionWords.better },
      { id: "worse", label: predictionWords.worse },
      { id: "same", label: predictionWords.same },
    ],
    // Worked out on the learner's own park: new nests, from one question up to the dial.
    answer: (state) => longRowOutcome(state),
  },
] as const satisfies readonly [Prediction<QuestionsState>];
