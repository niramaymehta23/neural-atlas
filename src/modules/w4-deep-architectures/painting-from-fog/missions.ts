import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { FEW, isFinished, isMush, type FogFrame, type FogState } from "./model";

export const missions = [
  {
    id: "fog-mush",
    ...missionWords,
    replay: { before: 2, after: 0 },
    // A finished clearing in a few steps whose picture is mush.
    when: (state, frame) => isFinished(state, frame) && state.cleanings <= FEW && isMush(frame),
  },
] as const satisfies readonly [Mission<FogState, FogFrame>];
