import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { guessAnswer, type PlacesFrame, type PlacesState } from "./model";

export const predictions = [
  {
    id: "king-to-queen",
    question: predictionWords.question,
    choices: [
      { id: "queen", label: predictionWords.queen },
      { id: "prince", label: predictionWords.prince },
      { id: "other", label: predictionWords.other },
    ],
    // Told once king, man and woman are on screen with the whole arrow followed and the start
    // words skipped, as the famous trick does it.
    answer: (_state, frame) => guessAnswer(frame),
  },
] as const satisfies readonly [Prediction<PlacesState, PlacesFrame>];
