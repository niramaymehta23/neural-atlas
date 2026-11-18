import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { UNNOTICED, wordsOf, type OrderFrame, type OrderState } from "./model";
import { words } from "./captions";

export const predictions = [
  {
    id: "no-stamps",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told once the example is on screen, turned around, with the stamps all the way down.
    answer: (_state, frame) =>
      frame !== undefined &&
      wordsOf(frame.sentence).join(" ") === words.example &&
      frame.shuffled &&
      frame.strength === 0
        ? frame.difference > UNNOTICED
          ? "yes"
          : "no"
        : null,
  },
] as const satisfies readonly [Prediction<OrderState, OrderFrame>];
