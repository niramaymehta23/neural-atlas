import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { MemoryFrame, MemoryState } from "./model";

export const predictions = [
  {
    id: "out-of-view",
    question: predictionWords.question,
    choices: [
      { id: "right", label: predictionWords.right },
      { id: "wrong", label: predictionWords.wrong },
    ],
    answer: (_state, frame) =>
      !frame || frame.inView ? null : frame.answers[0]?.word === frame.name ? "right" : "wrong",
  },
] as const satisfies readonly [Prediction<MemoryState, MemoryFrame>];
