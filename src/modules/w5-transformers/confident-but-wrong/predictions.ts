import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import type { TruthFrame, TruthState } from "./model";

/** Sure enough to count as sounding sure. */
const SURE = 0.5;

export const predictions = [
  {
    id: "hen-colour",
    question: predictionWords.question,
    choices: [
      { id: "dontKnow", label: predictionWords.dontKnow },
      { id: "makeUp", label: predictionWords.makeUp },
    ],
    answer: (_state, frame) =>
      !frame || frame.animal !== "hen" || frame.kind !== "colour"
        ? null
        : frame.madeUp && frame.sure >= SURE
          ? "makeUp"
          : "dontKnow",
  },
] as const satisfies readonly [Prediction<TruthState, TruthFrame>];
