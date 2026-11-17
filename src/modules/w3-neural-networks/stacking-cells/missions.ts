import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import {
  canLearn,
  hasQuietLayer,
  isSingleCell,
  isSpiral,
  isThisRun,
  teamSize,
  type CellsFrame,
  type CellsState,
} from "./model";

/** Practice that counts as "however long it practises", and the mistakes still left then. */
const LONG_PRACTICE = 150;
const STILL_WRONG = 0.45;
/** A team this small or smaller that fences the spiral this well wins (measured: 7–8 cells do). */
const FEW_CELLS = 8;
const FENCED_SPIRAL = 0.15;
/** "Overfit": a big team, a handful of flowers, almost no mistakes left. */
const FEW_FLOWERS = 5;
const BIG_TEAM = 16;
const LEARNED_BY_HEART = 0.05;

type CellsMission = Mission<CellsState, CellsFrame>;

export const missions = [
  {
    id: "spiral-one-cell",
    ...missionWords.oneCell,
    replay: { before: 20, after: 0 },
    when: (state, frame) =>
      isThisRun(state, frame) &&
      isSingleCell(state) &&
      isSpiral(state) &&
      frame.epoch >= LONG_PRACTICE &&
      frame.loss > STILL_WRONG,
  },
  {
    id: "spiral-few-cells",
    ...missionWords.fewCells,
    replay: { before: 20, after: 0 },
    when: (state, frame) =>
      isThisRun(state, frame) &&
      isSpiral(state) &&
      teamSize(state) <= FEW_CELLS &&
      frame.epoch > 0 &&
      frame.loss < FENCED_SPIRAL,
  },
  {
    id: "overfit-five",
    ...missionWords.overfit,
    replay: { before: 20, after: 0 },
    when: (state, frame) =>
      isThisRun(state, frame) &&
      canLearn(state.points) &&
      state.points.length <= FEW_FLOWERS &&
      teamSize(state) >= BIG_TEAM &&
      frame.epoch > 0 &&
      frame.loss < LEARNED_BY_HEART,
  },
  {
    id: "quiet-layer",
    ...missionWords.quiet,
    replay: { before: 10, after: 0 },
    when: (state, frame) =>
      isThisRun(state, frame) && frame.epoch > 0 && hasQuietLayer(state, frame.params),
  },
] as const satisfies readonly [CellsMission, ...CellsMission[]];
