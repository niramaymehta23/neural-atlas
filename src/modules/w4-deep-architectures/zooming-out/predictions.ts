import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { FEW_BLOCKS, keyOf, type ZoomFrame, type ZoomState } from "./model";

export const predictions = [
  {
    id: "few-blocks",
    question: predictionWords.question,
    choices: [
      { id: "keeps", label: predictionWords.keeps },
      { id: "loses", label: predictionWords.loses },
    ],
    // Told once the photo has been shrunk to a few blocks and the AI's answers are in.
    answer: (state, frame) =>
      frame !== undefined && frame.key === keyOf(state) && state.shrink >= FEW_BLOCKS
        ? frame.lastKnown >= state.shrink
          ? "keeps"
          : "loses"
        : null,
  },
] as const satisfies readonly [Prediction<ZoomState, ZoomFrame>];
