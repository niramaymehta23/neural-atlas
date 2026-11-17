import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { neverYes, type CellFrame, type CellState } from "./model";

export const missions = [
  {
    id: "never-yes",
    ...missionWords,
    replay: { before: 0, after: 0 },
    // Every mix of voices, all eight, gets a no.
    when: (state) => state.changes > 0 && neverYes(state),
  },
] as const satisfies readonly [Mission<CellState, CellFrame>];
