import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import {
  favouriteOf,
  isNow,
  MOST_OF_THE_TIME,
  NO_TREAT_ROUNDS,
  type TreatsFrame,
  type TreatsState,
} from "./model";

export const predictions = [
  {
    id: "never-a-treat",
    question: predictionWords.question,
    choices: [
      { id: "settles", label: predictionWords.settles },
      { id: "mixes", label: predictionWords.mixes },
    ],
    // Told once this puppy has played enough rounds without a single treat.
    answer: (state, frame) =>
      !isNow(state, frame) ||
      state.treats.length < NO_TREAT_ROUNDS ||
      state.treats.some((treat) => treat === 1)
        ? null
        : favouriteOf(frame).share >= MOST_OF_THE_TIME
          ? "settles"
          : "mixes",
  },
] as const satisfies readonly [Prediction<TreatsState, TreatsFrame>];
