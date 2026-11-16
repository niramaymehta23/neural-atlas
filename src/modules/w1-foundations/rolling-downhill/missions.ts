import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { flewOff, type DownhillFrame, type DownhillState } from "./model";

export const missions = [
  {
    id: "fly-off",
    ...missionWords,
    replay: { before: 12, after: 0 },
    when: (_state, frame) => flewOff(frame),
  },
] as const satisfies readonly [Mission<DownhillState, DownhillFrame>];
