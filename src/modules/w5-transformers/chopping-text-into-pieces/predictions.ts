import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { PiecesFrame, PiecesState } from "./model";

export const predictions = [
  {
    id: "dearer-greeting",
    question: predictionWords.question,
    choices: [
      { id: "english", label: predictionWords.english },
      { id: "gujarati", label: predictionWords.gujarati },
      { id: "same", label: predictionWords.same },
    ],
    // Told once Gujarati has been chopped on screen; worked out from the two fixed greetings with
    // every piece known, so the dials never change it.
    answer: (_state, frame) => (frame?.gujarati ? frame.dearer : null),
  },
] as const satisfies readonly [Prediction<PiecesState, PiecesFrame>];
