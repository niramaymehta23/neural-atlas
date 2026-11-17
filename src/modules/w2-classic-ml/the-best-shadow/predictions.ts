import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { pancakeAnswer, type ShadowState } from "./model";

export const predictions = [
  {
    id: "pancake-from-above",
    question: predictionWords.question,
    choices: [
      { id: "above", label: predictionWords.above },
      { id: "side", label: predictionWords.side },
    ],
    // Told once the learner shines the torch on the pancake from overhead or from the side.
    answer: (state) => pancakeAnswer(state),
  },
] as const satisfies readonly [Prediction<ShadowState>];
