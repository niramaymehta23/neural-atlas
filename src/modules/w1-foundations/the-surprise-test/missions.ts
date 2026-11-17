import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, scoreLied, type SurpriseFrame, type SurpriseState } from "./model";

export const missions = [
  {
    id: "peek-and-lie",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // It peeked, the brand-new dots have been tried, and the surprise test looks far too good.
    when: (state, frame) =>
      state.peek && state.fresh && isFinished(state, frame) && scoreLied(frame),
  },
] as const satisfies readonly [Mission<SurpriseState, SurpriseFrame>];
