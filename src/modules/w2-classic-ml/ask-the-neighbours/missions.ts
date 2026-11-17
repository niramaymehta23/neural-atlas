import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { oddOneDecided, type NeighboursState } from "./model";

export const missions = [
  {
    id: "one-odd-neighbour",
    ...missionWords.weirdo,
    replay: { before: 0, after: 0 },
    when: (state) => oddOneDecided(state),
  },
] as const satisfies readonly [Mission<NeighboursState>, ...Mission<NeighboursState>[]];
