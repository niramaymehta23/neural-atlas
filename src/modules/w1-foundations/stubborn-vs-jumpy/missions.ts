import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { dartsOf, grouping, SCATTERED, type DartsState } from "./model";

export const missions = [
  {
    id: "scatter-everywhere",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state) => grouping(dartsOf(state)).spread > SCATTERED,
  },
] as const satisfies readonly [Mission<DartsState>];
