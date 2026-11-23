import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { keyOf, type BoardFrame, type BoardState } from "./model";

export const missions = [
  {
    id: "trap-square",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // Judged on the view on screen: the frame worked out for this very board and these dials.
    when: (state, frame) =>
      frame !== undefined && frame.key === keyOf(state) && frame.traps.length > 0,
  },
] as const satisfies readonly [Mission<BoardState, BoardFrame>];
