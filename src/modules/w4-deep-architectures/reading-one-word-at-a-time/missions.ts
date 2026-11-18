import { GUESSING, LONG } from "@/features/memory/run";
import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, type ReadingFrame, type ReadingState } from "./model";

export const missions = [
  {
    id: "forget-the-start",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished run on long sentences that ends up no better than guessing.
    when: (state, frame) =>
      isFinished(state, frame) && state.length >= LONG && frame.right < GUESSING,
  },
] as const satisfies readonly [Mission<ReadingState, ReadingFrame>];
