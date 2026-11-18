import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { fooled, type PicturesFrame, type PicturesState } from "./model";

export const missions = [
  {
    id: "fool-it",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.threshold === state.threshold &&
      frame.placed.join() === state.placed.join() &&
      fooled(frame),
  },
] as const satisfies readonly [Mission<PicturesState, PicturesFrame>];
