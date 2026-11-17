import type { Prediction } from "@/platform/contract";
import { predictionWords, words } from "./captions";
import { firstToSettle, OUTCOMES, type DownhillFrame, type DownhillState } from "./model";

export const predictions = [
  {
    id: "first-to-settle",
    question: predictionWords.question,
    choices: OUTCOMES.map((id) => ({
      id,
      label: id === "none" || id === "tie" ? predictionWords[id] : words.walkers[id],
    })),
    answer: (_state, frame) => firstToSettle(frame),
    // A guess placed after a roll is about the next roll (DH-02).
    fresh: true,
  },
] as const satisfies readonly [Prediction<DownhillState, DownhillFrame>];
