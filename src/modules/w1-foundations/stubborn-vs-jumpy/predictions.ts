import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { dartsOf, landing, type DartsState } from "./model";

/** "Very bendy" and "a few examples", as the question means them. */
const VERY_BENDY = 7;
const FEW = 10;

export const predictions = [
  {
    id: "bendy-darts",
    question: predictionWords.question,
    choices: [
      { id: "bunched-off", label: predictionWords.bunchedOff },
      { id: "scattered", label: predictionWords.scattered },
      { id: "bullseye", label: predictionWords.bullseye },
    ],
    // Told by the darts on the board once the robots really are very bendy with few examples.
    answer: (state) =>
      state.bendy >= VERY_BENDY && state.examples <= FEW ? landing(dartsOf(state)) : null,
  },
] as const satisfies readonly [Prediction<DartsState>];
