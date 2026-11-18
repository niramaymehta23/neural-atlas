import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { matches, type SqueezeFrame, type SqueezeState } from "./model";

export const missions = [
  {
    id: "one-number",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The rebuild on screen comes from a single number.
    when: (state, frame) => matches(state, frame) && state.keep === 1,
  },
] as const satisfies readonly [Mission<SqueezeState, SqueezeFrame>];
