import type { Prediction } from "@/platform/contract";
import { CAPTIONS, PHOTOS, predictionWords } from "./captions";
import type { PicturesFrame, PicturesState } from "./model";

const CAR = CAPTIONS.findIndex(({ text }) => text === "a car");
const BICYCLE = PHOTOS.findIndex(({ kind }) => kind === "bicycle");

export const predictions = [
  {
    id: "car-on-bicycle",
    question: predictionWords.question,
    choices: [
      { id: "yes", label: predictionWords.yes },
      { id: "no", label: predictionWords.no },
    ],
    // Told once "a car" sits on the bicycle photo on screen, by the dial on screen.
    answer: (_state, frame) => {
      const placement = frame?.placements.find(
        ({ photo, caption }) => photo === BICYCLE && caption === CAR,
      );
      return placement ? (placement.match ? "yes" : "no") : null;
    },
  },
] as const satisfies readonly [Prediction<PicturesState, PicturesFrame>];
