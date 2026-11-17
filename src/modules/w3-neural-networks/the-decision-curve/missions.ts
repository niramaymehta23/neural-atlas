import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isFinished, MOSTLY, type CurveFrame, type CurveState } from "./model";

export const missions = [
  {
    id: "silent-forever",
    ...missionWords,
    replay: { before: 20, after: 0 },
    // A finished run of at least two cut-off cells, most of them silent for every input.
    when: (state, frame) =>
      isFinished(state, frame) &&
      state.bend === "relu" &&
      state.cells >= 2 &&
      frame.silent >= MOSTLY * state.cells,
  },
] as const satisfies readonly [Mission<CurveState, CurveFrame>];
