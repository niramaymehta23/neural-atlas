import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { forgot, runOf, type TuneFrame, type TuneState } from "./model";

export const missions = [
  {
    id: "forget-everything",
    ...missionWords,
    replay: { before: 2, after: 0 },
    when: (state, frame) => frame !== undefined && frame.run === runOf(state) && forgot(frame),
  },
] as const satisfies readonly [Mission<TuneState, TuneFrame>];
