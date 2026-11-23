import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isCurrent, SMALLEST_MEMORY, stalled, type CatchFrame, type CatchState } from "./model";

export const missions = [
  {
    id: "no-memory",
    ...missionWords,
    replay: { before: 6, after: 0 },
    when: (state, frame) =>
      state.memory === SMALLEST_MEMORY && isCurrent(state, frame) && stalled(frame),
  },
] as const satisfies readonly [Mission<CatchState, CatchFrame>];
