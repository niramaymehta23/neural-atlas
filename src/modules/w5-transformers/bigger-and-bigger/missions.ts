import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { lopsided, type ScaleFrame, type ScaleState } from "./model";

export const missions = [
  {
    id: "wrong-dial",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.brain === state.brain &&
      frame.reading === state.reading &&
      frame.budget === state.budget &&
      lopsided(frame),
  },
] as const satisfies readonly [Mission<ScaleState, ScaleFrame>];
