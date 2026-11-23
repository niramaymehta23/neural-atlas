import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, NEVER, stuckOnWorse, type CasinoState, type RaceFrame } from "./model";

export const missions = [
  {
    id: "never-new",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished race with no curiosity, where the curious bot stuck with a machine that isn't best.
    when: (state, frame) =>
      state.curious < NEVER && isFinished(state, frame) && stuckOnWorse(frame),
  },
] as const satisfies readonly [Mission<CasinoState, RaceFrame>];
