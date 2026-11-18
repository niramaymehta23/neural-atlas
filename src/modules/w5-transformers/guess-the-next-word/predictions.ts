import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { NextFrame, NextState } from "./model";

/** The guess is about twenty words or more, always picking the likeliest. */
const GUESS_WORDS = 20;

export const predictions = [
  {
    id: "greedy-story",
    question: predictionWords.question,
    choices: [
      { id: "fresh", label: predictionWords.fresh },
      { id: "circles", label: predictionWords.circles },
    ],
    answer: (_state, frame) =>
      frame === undefined || !frame.known || !frame.likeliest || frame.added < GUESS_WORDS
        ? null
        : frame.circles
          ? "circles"
          : "fresh",
  },
] as const satisfies readonly [Prediction<NextState, NextFrame>];
