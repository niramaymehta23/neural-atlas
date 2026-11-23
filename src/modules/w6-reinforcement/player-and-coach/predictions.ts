import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import {
  fellApart,
  isCurrent,
  MOST_BATCHES,
  MOST_ROUNDS,
  NO_RAIL,
  type CoachFrame,
  type CoachState,
} from "./model";

export const predictions = [
  {
    id: "no-rail-score",
    question: predictionWords.question,
    choices: [
      { id: "climbs", label: predictionWords.climbs },
      { id: "falls", label: predictionWords.falls },
    ],
    // Told by a run with no rail and the most study rounds: once it falls apart, or at its end.
    answer: (state, frame) => {
      if (state.clip !== NO_RAIL || state.rounds !== MOST_ROUNDS || !isCurrent(state, frame))
        return null;
      if (fellApart(frame)) return "falls";
      return frame.step >= MOST_BATCHES ? "climbs" : null;
    },
    // A guess made while a run is on screen waits for the next run.
    fresh: true,
  },
] as const satisfies readonly [Prediction<CoachState, CoachFrame>];
