import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { ASKED_AFTER, keyOf, type GlowFrame, type GlowState } from "./model";

export const predictions = [
  {
    id: "corner-after-three",
    question: predictionWords.question,
    choices: [
      { id: "warm", label: predictionWords.warm },
      { id: "not-yet", label: predictionWords.notYet },
    ],
    // Told once a glow for the board on screen has finished: did the corner warm by spread three?
    answer: (state, frame) => {
      if (!frame || !frame.last || frame.key !== keyOf(state)) return null;
      return frame.warmFrom >= 0 && frame.warmFrom <= ASKED_AFTER ? "warm" : "not-yet";
    },
    // A guess is about the next glow, never one already watched.
    fresh: true,
  },
] as const satisfies readonly [Prediction<GlowState, GlowFrame>];
