import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { blurred, type BlockFrame, type BlockState } from "./model";

/** The guess is about six blocks or more without the shortcut. */
const GUESS_BLOCKS = 6;

export const predictions = [
  {
    id: "without-shortcut",
    question: predictionWords.question,
    choices: [
      { id: "stay", label: predictionWords.stay },
      { id: "blur", label: predictionWords.blur },
    ],
    answer: (_state, frame) =>
      frame === undefined || frame.shortcut || frame.blocks < GUESS_BLOCKS
        ? null
        : blurred(frame)
          ? "blur"
          : "stay",
  },
] as const satisfies readonly [Prediction<BlockState, BlockFrame>];
