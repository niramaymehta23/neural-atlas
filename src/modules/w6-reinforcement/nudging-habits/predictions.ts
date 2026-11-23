import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { keyOf, type HabitFrame, type HabitState } from "./model";

export const predictions = [
  {
    id: "lucky-try",
    question: predictionWords.question,
    choices: [
      { id: "more", label: predictionWords.more },
      { id: "less", label: predictionWords.less },
      { id: "same", label: predictionWords.same },
    ],
    // Told by the run on screen once the nudge after its first bowl try has happened.
    answer: (state, frame) =>
      frame && frame.key === keyOf(state) && frame.lucky ? frame.lucky.then : null,
    fresh: true,
  },
] as const satisfies readonly [Prediction<HabitState, HabitFrame>];
