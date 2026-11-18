import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { allSame, viewsAfter, type FriendsState } from "./model";

export const missions = [
  {
    id: "everyone-identical",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // At least one round passed, and every view is (almost) exactly the same.
    when: (state) => state.rounds > 0 && allSame(viewsAfter(state.listen, state.rounds)),
  },
] as const satisfies readonly [Mission<FriendsState>];
