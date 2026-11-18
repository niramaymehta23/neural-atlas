import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { wrongBook, type LookFrame, type LookState } from "./model";

export const predictions = [
  {
    id: "wrong-book-answer",
    question: predictionWords.question,
    choices: [
      { id: "refuse", label: predictionWords.refuse },
      { id: "anyway", label: predictionWords.anyway },
    ],
    // Told once a wrong book is handed over: the chatbot answers from it, or (if it had nothing
    // to answer from) says it can't.
    answer: (_state, frame) =>
      !frame || frame.truth < 0 || frame.used < 0 || frame.used === frame.truth
        ? null
        : wrongBook(frame)
          ? "anyway"
          : "refuse",
  },
] as const satisfies readonly [Prediction<LookState, LookFrame>];
