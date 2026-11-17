import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { isFinished, plant, type SplitFrame, type SplitState } from "./model";

/** Most flowers right counts as split. */
const SPLIT = 0.9;
const RING = plant("ring").length;

export const predictions = [
  {
    id: "ring-fence",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told by a finished fence on the ring as planted (a few flowers pulled up still counts).
    answer: (state, frame) =>
      state.garden !== "ring" || state.points.length < RING * 0.9 || !isFinished(state, frame)
        ? null
        : frame.right / state.points.length >= SPLIT
          ? "yes"
          : "no",
    fresh: true,
  },
] as const satisfies readonly [Prediction<SplitState, SplitFrame>];
