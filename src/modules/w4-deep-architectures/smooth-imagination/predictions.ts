import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { MapFrame, MapState } from "./model";

export const predictions = [
  {
    id: "every-spot",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by the fixed 12 × 12 check of the untidy map, never by the dials, once it is seen.
    answer: (_state, frame) =>
      frame && frame.tidy === 0 && frame.torn !== null ? (frame.torn > 0 ? "no" : "yes") : null,
  },
] as const satisfies readonly [Prediction<MapState, MapFrame>];
