import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { carefulLost, isFinished, type SmarterFrame, type SmarterState } from "./model";

export const missions = [
  {
    id: "careful-loses",
    ...missionWords,
    replay: { before: 40, after: 0, framesPerSecond: 15 },
    when: (state, frame) => isFinished(state, frame) && carefulLost(state.valley, frame),
  },
] as const satisfies readonly [Mission<SmarterState, SmarterFrame>];
