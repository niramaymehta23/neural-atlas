import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import {
  answered,
  appleChance,
  isNonsense,
  sureness,
  VERY_SURE,
  type ForwardFrame,
  type ForwardState,
} from "./model";

export const predictions = [
  {
    id: "sure-about-nonsense",
    question: predictionWords.question,
    choices: [
      { id: "very", label: predictionWords.very },
      { id: "unsure", label: predictionWords.unsure },
    ],
    // Told by the first finished thought about something no fruit could be.
    answer: (state) =>
      !answered(state) || !isNonsense(state)
        ? null
        : sureness(appleChance(state)) >= VERY_SURE
          ? "very"
          : "unsure",
  },
] as const satisfies readonly [Prediction<ForwardState, ForwardFrame>];
