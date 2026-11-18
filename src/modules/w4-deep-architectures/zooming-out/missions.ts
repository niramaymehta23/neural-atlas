import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { keyOf, type ZoomFrame, type ZoomState } from "./model";

export const missions = [
  {
    id: "smallest-known",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // Shrunk to the last step at which the AI still says what it said for the full photo.
    when: (state, frame) =>
      frame !== undefined &&
      frame.key === keyOf(state) &&
      state.shrink > 0 &&
      state.shrink === frame.lastKnown,
  },
] as const satisfies readonly [Mission<ZoomState, ZoomFrame>];
