import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { fakeSource, type TruthFrame, type TruthState } from "./model";

export const missions = [
  {
    id: "fake-source",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.animal === state.animal &&
      frame.kind === state.kind &&
      frame.source === state.source &&
      fakeSource(frame),
  },
] as const satisfies readonly [Mission<TruthState, TruthFrame>];
