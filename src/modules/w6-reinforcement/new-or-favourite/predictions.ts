import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, NEVER, type CasinoState, type RaceFrame } from "./model";

export const predictions = [
  {
    id: "never-or-checking",
    question: predictionWords.question,
    choices: [
      { id: "never", label: predictionWords.never },
      { id: "hopeful", label: predictionWords.hopeful },
    ],
    // Told by a finished race in which the curious bot had no curiosity at all.
    answer: (state, frame) => {
      if (state.curious >= NEVER || !isFinished(state, frame)) return null;
      const [never, hopeful] = frame.bots;
      return never.wins > hopeful.wins ? "never" : "hopeful";
    },
    fresh: true,
  },
] as const satisfies readonly [Prediction<CasinoState, RaceFrame>];
