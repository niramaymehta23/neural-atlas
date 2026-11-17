import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { examVersusPractice, isFinished, type StudyFrame, type StudyState } from "./model";

export const predictions = [
  {
    id: "exam-versus-practice",
    question: predictionWords.question,
    choices: [
      { id: "better", label: predictionWords.better },
      { id: "same", label: predictionWords.same },
      { id: "worse", label: predictionWords.worse },
    ],
    answer: (state, frame) => (isFinished(state, frame) ? examVersusPractice(frame) : null),
    fresh: true,
  },
] as const satisfies readonly [Prediction<StudyState, StudyFrame>];
