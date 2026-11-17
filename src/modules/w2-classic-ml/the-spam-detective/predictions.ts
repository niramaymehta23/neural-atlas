import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { grandmaVerdict, type SpamState } from "./model";

export const predictions = [
  {
    id: "grandmas-message",
    question: predictionWords.question,
    choices: [
      { id: "spam", label: predictionWords.spam },
      { id: "normal", label: predictionWords.normal },
    ],
    // Told once Grandma's message is in the box, read with the standard dials so it never moves.
    answer: (state) => grandmaVerdict(state),
  },
] as const satisfies readonly [Prediction<SpamState>];
