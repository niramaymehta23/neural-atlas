import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { FAR, isFinished, type DrawFrame, type DrawState } from "./model";

export const missions = [
  {
    id: "too-few-cells",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished run of one or two cells that is still far off the squiggle.
    when: (state, frame) => isFinished(state, frame) && state.cells <= 2 && frame.loss >= FAR,
  },
] as const satisfies readonly [Mission<DrawState, DrawFrame>];
