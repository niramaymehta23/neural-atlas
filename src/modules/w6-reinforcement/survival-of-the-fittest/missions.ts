import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { gainOf, isFinished, STALL, WILD_CHANGE, type RaceFrame, type RaceState } from "./model";

export const missions = [
  {
    id: "nothing-improves",
    ...missionWords,
    replay: { before: 49, after: 0 },
    // Finished races where every child was nearly a new random car and the best barely moved on.
    when: (state, frame) =>
      state.change >= WILD_CHANGE && isFinished(state, frame) && gainOf(frame) <= STALL,
  },
] as const satisfies readonly [Mission<RaceState, RaceFrame>];
