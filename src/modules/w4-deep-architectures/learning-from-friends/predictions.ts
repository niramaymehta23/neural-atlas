import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { rightGuesses, UNBADGED, viewsAfter, type FriendsState } from "./model";

/** The round the guess is about. */
export const GUESS_ROUNDS = 3;

export const predictions = [
  {
    id: "three-rounds",
    question: predictionWords.question,
    choices: [
      { id: "most", label: predictionWords.most },
      { id: "few", label: predictionWords.few },
    ],
    // Told once the network has passed messages exactly three times.
    answer: (state) =>
      state.rounds !== GUESS_ROUNDS
        ? null
        : rightGuesses(viewsAfter(state.listen, state.rounds)) > UNBADGED / 2
          ? "most"
          : "few",
  },
] as const satisfies readonly [Prediction<FriendsState>];
