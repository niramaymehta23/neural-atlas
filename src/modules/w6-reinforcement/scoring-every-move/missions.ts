import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import type { ScoringFrame, ScoringState } from "./model";

/** "Too fast": the learning-speed dial near the top. Settling takes this many tries. */
const TOO_FAST = 0.85;
const SETTLING_TRIES = 150;
/** How much the scores still jump per move when they are not settling. */
const UNSETTLED = 0.06;

export const missions = [
  {
    id: "too-fast-to-settle",
    ...missionWords,
    replay: { before: 30, after: 0 },
    when: (state, frame) =>
      state.learnRate >= TOO_FAST &&
      (frame?.epoch ?? 0) >= SETTLING_TRIES &&
      (frame?.wobble ?? 0) >= UNSETTLED,
  },
] as const satisfies readonly [Mission<ScoringState, ScoringFrame>];
