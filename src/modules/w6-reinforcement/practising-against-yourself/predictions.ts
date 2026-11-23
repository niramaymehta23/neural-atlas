import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { DEFAULT_GAMES, EVEN, isFinished, type PracticeFrame, type PracticeState } from "./model";

export const predictions = [
  {
    id: "who-wins-more",
    question: predictionWords.question,
    choices: [
      { id: "pip", label: predictionWords.pip },
      { id: "even", label: predictionWords.even },
      { id: "pop", label: predictionWords.pop },
    ],
    // Told by a finished practice where both learn, a thousand games or more: measured, they
    // trade wins at every curiosity (see EVEN).
    answer: (state, frame) => {
      if (state.frozen || state.games < DEFAULT_GAMES || !isFinished(state, frame)) return null;
      const share = frame.pipShare ?? 0.5;
      return share > EVEN.high ? "pip" : share < EVEN.low ? "pop" : "even";
    },
    fresh: true,
  },
] as const satisfies readonly [Prediction<PracticeState, PracticeFrame>];
