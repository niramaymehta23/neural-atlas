import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { keyOf, presetOf, type TorchFrame, type TorchState } from "./model";

export const predictions = [
  {
    id: "edge-torch",
    question: predictionWords.question,
    choices: [
      { id: "edges", label: predictionWords.edges },
      { id: "bright", label: predictionWords.bright },
      { id: "nowhere", label: predictionWords.nowhere },
    ],
    // Told once the up-and-down edge torch has swept the whole photo; read from the photo itself.
    answer: (state, frame) =>
      presetOf(state.torch) === "upDown" &&
      state.sweep >= 1 &&
      frame !== undefined &&
      frame.key === keyOf(state)
        ? frame.lit
        : null,
  },
] as const satisfies readonly [Prediction<TorchState, TorchFrame>];
