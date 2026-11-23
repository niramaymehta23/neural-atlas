import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { missedThePuzzle, type AheadFrame, type AheadState } from "./model";

export const missions = [
  {
    id: "one-move-ahead",
    ...missionWords,
    replay: { before: 1, after: 0 },
    // From the puzzle it did not block your slant, and your very next disc made four.
    when: (state) => missedThePuzzle(state.moves),
  },
] as const satisfies readonly [Mission<AheadState, AheadFrame>];
