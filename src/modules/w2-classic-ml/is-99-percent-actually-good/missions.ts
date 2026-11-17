import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { lazyButProud, type SortState } from "./model";

export const missions = [
  {
    id: "lazy-but-proud",
    ...missionWords.lazy,
    replay: { before: 0, after: 0 },
    when: (state) => lazyButProud(state),
  },
] as const satisfies readonly [Mission<SortState>, ...Mission<SortState>[]];
