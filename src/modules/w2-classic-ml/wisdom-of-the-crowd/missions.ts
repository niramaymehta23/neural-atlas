import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { allTheSame, type CrowdState } from "./model";

export const missions = [
  {
    id: "every-tree-the-same",
    ...missionWords.same,
    replay: { before: 0, after: 0 },
    when: (state) => allTheSame(state),
  },
] as const satisfies readonly [Mission<CrowdState>, ...Mission<CrowdState>[]];
