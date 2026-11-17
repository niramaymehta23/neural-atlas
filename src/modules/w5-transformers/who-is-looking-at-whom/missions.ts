import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { hogs, type LookingFrame, type LookingState } from "./model";

export const missions = [
  {
    id: "hog-attention",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (_state, frame) => (frame ? hogs(frame) : false),
  },
] as const satisfies readonly [Mission<LookingState, LookingFrame>];
