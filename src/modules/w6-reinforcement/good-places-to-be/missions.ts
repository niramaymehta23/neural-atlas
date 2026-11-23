import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { keyOf, type GlowFrame, type GlowState } from "./model";

export const missions = [
  {
    id: "hide-the-reward",
    ...missionWords,
    replay: { before: 10, after: 0 },
    // A glow on screen for this very board that has finished spreading with nothing warm.
    when: (state, frame) =>
      frame !== undefined && frame.key === keyOf(state) && frame.last && frame.warm === 0,
  },
] as const satisfies readonly [Mission<GlowState, GlowFrame>];
