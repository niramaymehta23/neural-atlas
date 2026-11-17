import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { keyOf, type GiantFrame, type GiantState } from "./model";

/** More than this many photos apart counts as one start doing better. */
const CLOSE = 1;

export const predictions = [
  {
    id: "which-start",
    question: predictionWords.question,
    choices: [
      { id: "giant", label: predictionWords.giant },
      { id: "blank", label: predictionWords.blank },
      { id: "same", label: predictionWords.same },
    ],
    // Told once both starts have been taught with one photo of each.
    answer: (state, frame) => {
      if (frame === undefined || frame.key !== keyOf(state) || state.teach !== 1) return null;
      if (frame.giant > frame.blank + CLOSE) return "giant";
      if (frame.blank > frame.giant + CLOSE) return "blank";
      return "same";
    },
  },
] as const satisfies readonly [Prediction<GiantState, GiantFrame>];
