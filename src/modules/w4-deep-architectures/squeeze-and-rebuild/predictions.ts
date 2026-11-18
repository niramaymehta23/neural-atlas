import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { SqueezeFrame, SqueezeState } from "./model";

/** Told once the learner has speckled the picture at least halfway. */
const SPECKLED_ENOUGH = 0.5;

export const predictions = [
  {
    id: "speckles",
    question: predictionWords.question,
    choices: [
      { id: "speckled", label: predictionWords.speckled },
      { id: "clean", label: predictionWords.clean },
    ],
    // Judged at fixed settings (a fully speckled face, all sixteen numbers), never by the dials.
    answer: (_state, frame) =>
      frame && frame.smudge >= SPECKLED_ENOUGH
        ? frame.cleansSpeckles
          ? "clean"
          : "speckled"
        : null,
  },
] as const satisfies readonly [Prediction<SqueezeState, SqueezeFrame>];
