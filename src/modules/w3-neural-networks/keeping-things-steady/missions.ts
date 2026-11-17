import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, stalled, type SteadyFrame, type SteadyState } from "./model";

export const missions = [
  {
    id: "deep-stalls",
    ...missionWords,
    replay: { before: 40, after: 0, framesPerSecond: 15 },
    when: (state, frame) => isFinished(state, frame) && stalled(state, frame),
  },
] as const satisfies readonly [Mission<SteadyState, SteadyFrame>];
