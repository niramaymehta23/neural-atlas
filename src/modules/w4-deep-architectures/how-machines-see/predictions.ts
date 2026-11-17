import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { FAINT, matches, type SeeFrame, type SeeState } from "./model";

export const predictions = [
  {
    id: "faint-smudge",
    question: predictionWords.question,
    choices: [
      { id: "same", label: predictionWords.same },
      { id: "fooled", label: predictionWords.fooled },
    ],
    // Told once a smudge too faint to see has been tried on the picture on screen.
    answer: (state, frame) =>
      state.smudge && state.strength <= FAINT && matches(state, frame) && frame.fooled !== null
        ? frame.fooled
          ? "fooled"
          : "same"
        : null,
  },
] as const satisfies readonly [Prediction<SeeState, SeeFrame>];
