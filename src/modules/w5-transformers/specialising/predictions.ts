import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { forgot, runOf, type TuneFrame, type TuneState } from "./model";

/** The guess is about a hundred steps of the style alone. */
const STEPS = 100;

export const predictions = [
  {
    id: "everyday-after",
    question: predictionWords.question,
    choices: [
      { id: "same", label: predictionWords.same },
      { id: "worse", label: predictionWords.worse },
    ],
    answer: (state, frame) =>
      !frame || frame.run !== runOf(state) || state.mix > 0 || frame.step < STEPS
        ? null
        : forgot(frame)
          ? "worse"
          : "same",
  },
] as const satisfies readonly [Prediction<TuneState, TuneFrame>];
