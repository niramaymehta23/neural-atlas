import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { IT_CHOICES, type LookingFrame, type LookingState } from "./model";

export const predictions = [
  {
    id: "what-it-means",
    question: predictionWords.question,
    choices: IT_CHOICES.map((word) => ({ id: word, label: predictionWords.choices[word] })),
    answer: (_state, frame) => frame?.itLooksAt ?? null,
  },
] as const satisfies readonly [Prediction<LookingState, LookingFrame>];
