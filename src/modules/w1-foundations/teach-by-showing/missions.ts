import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import {
  isCurrent,
  LOW_SCORE,
  robotScore,
  wrongLabels,
  type TeachFrame,
  type TeachState,
} from "./model";

export const missions = [
  {
    id: "wrong-labels",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // The robot tried on these very baskets, some of which you filled wrongly, and did badly.
    when: (state, frame) =>
      isCurrent(state, frame) && wrongLabels(state) > 0 && robotScore(state) <= LOW_SCORE,
  },
] as const satisfies readonly [Mission<TeachState, TeachFrame>];
