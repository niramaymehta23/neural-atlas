import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { byHeart, runOf, type ReadingFrame, type ReadingState } from "./model";

export const missions = [
  {
    id: "one-sentence",
    ...missionWords,
    replay: { before: 2, after: 0 },
    when: (state, frame) =>
      frame !== undefined && frame.run === runOf(state) && byHeart(state.text, frame),
  },
] as const satisfies readonly [Mission<ReadingState, ReadingFrame>];
