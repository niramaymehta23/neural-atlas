import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, ONLY_FLATTERS, type ChatFrame, type ChatState } from "./model";

/** The leash dial counts as off below this, and training as very long from here. */
export const LEASH_OFF = 0.05;
export const VERY_LONG = 0.9;

export const predictions = [
  {
    id: "no-leash",
    question: predictionWords.question,
    choices: [
      { id: "helpful", label: predictionWords.helpful },
      { id: "flatters", label: predictionWords.flatters },
    ],
    // Told by a finished run with the leash off and a very long training.
    answer: (state, frame) =>
      state.leash > LEASH_OFF || state.train < VERY_LONG || !isFinished(state, frame)
        ? null
        : frame.praise >= ONLY_FLATTERS
          ? "flatters"
          : "helpful",
    fresh: true,
  },
] as const satisfies readonly [Prediction<ChatState, ChatFrame>];
