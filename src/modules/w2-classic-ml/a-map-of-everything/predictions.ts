import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { noiseAnswer, type MapFrame, type MapState } from "./model";

export const predictions = [
  {
    id: "islands-in-noise",
    question: predictionWords.question,
    choices: [
      { id: "islands", label: predictionWords.islands },
      { id: "even", label: predictionWords.even },
    ],
    // Read from the learner's own settled map of noise; a guess waits for the next map.
    answer: (state, frame) => noiseAnswer(state, frame),
    fresh: true,
  },
] as const satisfies readonly [Prediction<MapState, MapFrame>];
