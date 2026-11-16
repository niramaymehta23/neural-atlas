import type { Prediction } from "@/platform/contract";
import { predictionWords, words } from "./captions";
import { firstToSettle, WALKERS, type DownhillFrame, type DownhillState } from "./model";

export const predictions = [
  {
    id: "first-to-settle",
    question: predictionWords.question,
    choices: WALKERS.map((walker) => ({ id: walker, label: words.walkers[walker] })),
    answer: (state, frame) => firstToSettle(frame, state.valley),
  },
] as const satisfies readonly [Prediction<DownhillState, DownhillFrame>];
