import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, ONE_FACE, TRIES, type DuelFrame, type DuelState } from "./model";

export const predictions = [
  {
    id: "eight-tries",
    question: predictionWords.question,
    choices: [
      { id: "many", label: predictionWords.many },
      { id: "one", label: predictionWords.one },
    ],
    // Told by a finished duel with eight forger tries per look.
    answer: (state, frame) =>
      state.tries !== TRIES.max || !isFinished(state, frame)
        ? null
        : frame.bunched >= ONE_FACE
          ? "one"
          : "many",
    fresh: true,
  },
] as const satisfies readonly [Prediction<DuelState, DuelFrame>];
