import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { ALL_LOOPHOLES, type LoopholeFrame, type LoopholeState } from "./model";

export const missions = [
  {
    id: "three-loopholes",
    ...missionWords,
    replay: { before: 10, after: 0 },
    // Found over several days, kept in state: every loophole there is.
    when: (state) => ALL_LOOPHOLES.every((loophole) => state.found.includes(loophole)),
  },
] as const satisfies readonly [Mission<LoopholeState, LoopholeFrame>];
