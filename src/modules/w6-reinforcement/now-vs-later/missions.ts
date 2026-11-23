import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { keyOf, type NowFrame, type NowState } from "./model";

export const missions = [
  {
    id: "only-this-second",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The telescope at its very bottom, and the plan on screen going to neither bowl.
    when: (state, frame) =>
      state.care <= 0 &&
      frame !== undefined &&
      frame.key === keyOf(state) &&
      frame.destination === "neither",
  },
] as const satisfies readonly [Mission<NowState, NowFrame>];
