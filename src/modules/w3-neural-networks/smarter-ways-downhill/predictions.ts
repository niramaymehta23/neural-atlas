import { firstToSettle, OUTCOMES } from "@/features/building/race/race";
import type { Prediction } from "@/platform/contract";
import { predictionWords, words } from "./captions";
import { isFinished, type SmarterFrame, type SmarterState } from "./model";

export const predictions = [
  {
    id: "ravine-first",
    question: predictionWords.question,
    choices: OUTCOMES.map((id) => ({
      id,
      label: id === "none" || id === "tie" ? predictionWords[id] : words.walkers[id],
    })),
    // Told only by a finished race in the long ravine.
    answer: (state, frame) =>
      state.valley === "ravine" && isFinished(state, frame) ? firstToSettle(frame) : null,
    fresh: true,
  },
] as const satisfies readonly [Prediction<SmarterState, SmarterFrame>];
