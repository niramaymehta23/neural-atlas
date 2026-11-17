import type { Prediction, TimelineFrame } from "@/platform/contract";
import { predictionWords, words } from "./captions";
import { FACTS, mostImportant, type SeesState } from "./model";

export const predictions = [
  {
    id: "most-important-fact",
    question: predictionWords.question,
    choices: FACTS.map((id) => ({ id, label: words.facts[id] })),
    // The answer never moves with the dials: it comes from the guesser told every fact. It shows
    // once the learner has told or hidden a fact and seen what that does.
    answer: (state) => (state.changes > 0 ? mostImportant() : null),
  },
] as const satisfies readonly [Prediction<SeesState, TimelineFrame>];
