import { readable } from "@/engine/pretrained/attention";
import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { lostSense, sameOff, type ReadersFrame, type ReadersState } from "./model";

export const missions = [
  {
    id: "lose-the-sense",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state, frame) =>
      frame !== undefined &&
      frame.sentence === readable(state.sentence) &&
      frame.depth === state.depth &&
      sameOff(frame.off, state.off) &&
      frame.off.length < 12 &&
      lostSense(frame),
  },
] as const satisfies readonly [Mission<ReadersState, ReadersFrame>];
