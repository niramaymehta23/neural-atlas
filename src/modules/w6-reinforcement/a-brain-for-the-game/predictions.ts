import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import {
  isCurrent,
  MOST_GAMES,
  SMALLEST_MEMORY,
  stalled,
  type CatchFrame,
  type CatchState,
} from "./model";

export const predictions = [
  {
    id: "no-memory-catches",
    question: predictionWords.question,
    choices: [
      { id: "well", label: predictionWords.well },
      { id: "stalls", label: predictionWords.stalls },
    ],
    // Told only by a finished run with the smallest memory, whatever the step size.
    answer: (state, frame) =>
      state.memory !== SMALLEST_MEMORY || !isCurrent(state, frame) || frame.step < MOST_GAMES
        ? null
        : stalled(frame)
          ? "stalls"
          : "well",
    // A guess made while a run is on screen waits for the next run.
    fresh: true,
  },
] as const satisfies readonly [Prediction<CatchState, CatchFrame>];
