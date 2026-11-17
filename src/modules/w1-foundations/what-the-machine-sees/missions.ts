import type { Mission, TimelineFrame } from "@/platform/contract";
import { missionWords } from "./captions";
import { sizeHiddenHurts, type SeesState } from "./model";

export const missions = [
  {
    id: "hide-size",
    ...missionWords,
    replay: { before: 0, after: 0 },
    when: (state) => sizeHiddenHurts(state),
  },
] as const satisfies readonly [Mission<SeesState, TimelineFrame>];
