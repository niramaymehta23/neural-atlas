import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { keyOf, MOST_STRICT_FOR_MISSION, NOTHING, type TorchFrame, type TorchState } from "./model";

export const missions = [
  {
    id: "finds-nothing",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The whole photo swept with a gentle cut-off, and nothing found anywhere.
    when: (state, frame) =>
      frame !== undefined &&
      frame.key === keyOf(state) &&
      state.sweep >= 1 &&
      state.strict <= MOST_STRICT_FOR_MISSION &&
      frame.strongest <= NOTHING,
  },
] as const satisfies readonly [Mission<TorchState, TorchFrame>];
