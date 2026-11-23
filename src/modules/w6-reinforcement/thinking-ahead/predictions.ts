import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { DEFAULT_FUTURES, FOCUSED, type AheadFrame, type AheadState } from "./model";

export const predictions = [
  {
    id: "where-it-imagines",
    question: predictionWords.question,
    choices: [
      { id: "even", label: predictionWords.even },
      { id: "one", label: predictionWords.one },
    ],
    // Told by a finished thinking about the puzzle with thousands of pretend games: measured, the
    // blocking column takes most of them whatever the game length (see FOCUSED).
    answer: (_state, frame) =>
      !frame || !frame.finished || !frame.puzzle || frame.futures < DEFAULT_FUTURES
        ? null
        : frame.topShare >= FOCUSED
          ? "one"
          : "even",
    fresh: true,
  },
] as const satisfies readonly [Prediction<AheadState, AheadFrame>];
