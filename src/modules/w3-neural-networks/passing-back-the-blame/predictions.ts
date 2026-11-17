import { rainShares } from "@/features/building/GradientRain";
import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, type BlameFrame, type BlameState } from "./model";

/** Shares this close count as "the same everywhere". */
const SAME = 0.5;
const DEEP = 3;

export const predictions = [
  {
    id: "thinnest-rain",
    question: predictionWords.question,
    choices: [
      { id: "answer", label: predictionWords.answer },
      { id: "start", label: predictionWords.start },
      { id: "same", label: predictionWords.same },
    ],
    // Told by a finished run of a deep stack of S-shaped cells.
    answer: (state, frame) => {
      if (state.bend !== "sigmoid" || state.layers < DEEP || !isFinished(state, frame)) return null;
      const shares = rainShares(frame.blame);
      const least = Math.min(...shares);
      if (least >= SAME) return "same";
      return shares.indexOf(least) < shares.length / 2 ? "start" : "answer";
    },
    fresh: true,
  },
] as const satisfies readonly [Prediction<BlameState, BlameFrame>];
