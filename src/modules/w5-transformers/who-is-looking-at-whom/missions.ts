import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import type { LookingFrame, LookingState } from "./model";

/** Share of all the looking (every reader blended) that counts as hogging it. */
export const HOG = 0.4;

export const missions = [
  {
    id: "hog-attention",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (_state, frame) => (frame?.hog ?? 0) >= HOG,
  },
] as const satisfies readonly [Mission<LookingState, LookingFrame>];
