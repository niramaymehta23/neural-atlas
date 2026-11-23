import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { keyOf, tripChange, VERY_SLIPPERY, type BoardFrame, type BoardState } from "./model";

export const predictions = [
  {
    id: "slippery-trip",
    question: predictionWords.question,
    choices: [
      { id: "longer", label: predictionWords.longer },
      { id: "same", label: predictionWords.same },
    ],
    // Revealed once the floor on screen is very slippery: its trip home against a still floor's.
    answer: (state, frame) =>
      frame && frame.key === keyOf(state) && state.slippery >= VERY_SLIPPERY
        ? tripChange(frame)
        : null,
  },
] as const satisfies readonly [Prediction<BoardState, BoardFrame>];
