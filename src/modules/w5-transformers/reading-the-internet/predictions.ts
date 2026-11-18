import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { byHeart, isOneSentence, runOf, type ReadingFrame, type ReadingState } from "./model";

/** "Plenty of practice" for the guess. */
const PLENTY = 100;

/** Share of the written words that are words of the sentence it read. */
function realShare(sample: string, text: string) {
  const known = new Set(text.toLowerCase().match(/[a-z']+/g) ?? []);
  const written = sample.toLowerCase().match(/[a-z']+/g) ?? [];
  return written.length === 0
    ? 0
    : written.filter((word) => known.has(word)).length / written.length;
}

export const predictions = [
  {
    id: "one-sentence-writes",
    question: predictionWords.question,
    choices: [
      { id: "fresh", label: predictionWords.fresh },
      { id: "copy", label: predictionWords.copy },
      { id: "gibberish", label: predictionWords.gibberish },
    ],
    // Told once a one-sentence run on screen has practised plenty.
    answer: (state, frame) => {
      if (!frame || frame.run !== runOf(state) || !isOneSentence(state.text) || frame.step < PLENTY)
        return null;
      if (byHeart(state.text, frame)) return "copy";
      return realShare(frame.sample, state.text) < 0.5 ? "gibberish" : "fresh";
    },
  },
] as const satisfies readonly [Prediction<ReadingState, ReadingFrame>];
