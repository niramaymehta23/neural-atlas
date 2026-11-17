import { DRY_SHARE } from "@/features/building/GradientRain";
import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, startShare, type BlameFrame, type BlameState } from "./model";

export const missions = [
  {
    id: "dry-rain",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished run of S-shaped cells where the first layer is dry in the rain.
    when: (state, frame) =>
      isFinished(state, frame) &&
      state.bend === "sigmoid" &&
      state.layers >= 2 &&
      startShare(frame) < DRY_SHARE,
  },
] as const satisfies readonly [Mission<BlameState, BlameFrame>];
