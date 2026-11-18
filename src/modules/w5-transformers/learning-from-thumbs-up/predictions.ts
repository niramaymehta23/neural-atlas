import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { judgePick, type ThumbsFrame, type ThumbsState } from "./model";

/** Picks before the guess can be told. */
const ENOUGH = 10;

export const predictions = [
  {
    id: "praise-rewarded",
    question: predictionWords.question,
    choices: [
      { id: "accurate", label: predictionWords.accurate },
      { id: "please", label: predictionWords.please },
    ],
    // Told once ten or more picks on screen all rewarded praise.
    answer: (_state, frame) =>
      !frame ||
      frame.picks.length < ENOUGH ||
      frame.picks.some((pick, at) => pick !== judgePick(at))
        ? null
        : frame.yesMan
          ? "please"
          : "accurate",
  },
] as const satisfies readonly [Prediction<ThumbsState, ThumbsFrame>];
