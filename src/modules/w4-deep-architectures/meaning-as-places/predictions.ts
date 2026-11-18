import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { catNearer, isFinished, squashed, type MapFrame, type MapState } from "./model";

export const predictions = [
  {
    id: "cat-near",
    question: predictionWords.question,
    choices: [
      { id: "dog", label: predictionWords.dog },
      { id: "bus", label: predictionWords.bus },
    ],
    // Told by a finished map; a squashed map has every word in one spot, so it tells nothing.
    answer: (state, frame) =>
      !isFinished(state, frame) || squashed(frame) ? null : catNearer(frame.places),
    fresh: true,
  },
] as const satisfies readonly [Prediction<MapState, MapFrame>];
