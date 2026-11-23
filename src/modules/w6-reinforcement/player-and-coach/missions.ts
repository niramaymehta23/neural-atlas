import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { fellApart, isCurrent, NO_RAIL, type CoachFrame, type CoachState } from "./model";

export const missions = [
  {
    id: "no-safety-rail",
    ...missionWords,
    replay: { before: 6, after: 0, framesPerSecond: 3 },
    when: (state, frame) => state.clip === NO_RAIL && isCurrent(state, frame) && fellApart(frame),
  },
] as const satisfies readonly [Mission<CoachState, CoachFrame>];
