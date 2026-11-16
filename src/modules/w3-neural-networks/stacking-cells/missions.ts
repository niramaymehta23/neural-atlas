import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { isSingleCell, type CellsFrame, type CellsState } from "./model";

/** Practice that counts as "however long it practises", and the mistakes still left then. */
const LONG_PRACTICE = 150;
const STILL_WRONG = 0.45;

export const missions = [
  {
    id: "spiral-one-cell",
    ...missionWords,
    replay: { before: 20, after: 0 },
    when: (state, frame) =>
      isSingleCell(state) &&
      state.garden === "spiral" &&
      (frame?.epoch ?? 0) >= LONG_PRACTICE &&
      (frame?.loss ?? 0) > STILL_WRONG,
  },
] as const satisfies readonly [Mission<CellsState, CellsFrame>];
