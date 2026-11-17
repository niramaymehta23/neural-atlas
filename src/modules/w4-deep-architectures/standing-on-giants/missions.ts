import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { keyOf, MOST_RIGHT, type GiantFrame, type GiantState } from "./model";

export const missions = [
  {
    id: "one-photo-each",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // Taught with one photo of each, it names most of the kept-back photos right.
    when: (state, frame) =>
      frame !== undefined &&
      frame.key === keyOf(state) &&
      state.teach === 1 &&
      frame.right >= MOST_RIGHT,
  },
] as const satisfies readonly [Mission<GiantState, GiantFrame>];
