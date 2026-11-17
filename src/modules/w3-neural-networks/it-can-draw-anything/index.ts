import { count, sentenceStart } from "@/design/copy";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { DrawControls } from "./controls";
import { DrawDrawer } from "./drawer";
import { missions } from "./missions";
import { CELLS, COLUMNS, isFinished, READY, type DrawFrame, type DrawState } from "./model";
import { predictions } from "./predictions";
import { DrawScene, howClose } from "./scene";

const MOST_RUNS = 10_000;

const cellWords = (cells: number) =>
  sentenceStart(cells === 1 ? words.cells.one : words.cells.many(count(cells)));

/** Exactly one height per spot, each between −1 and 1, from whatever a link holds. */
const heightsOf = (saved: unknown, fallback: readonly number[]) => {
  if (!Array.isArray(saved)) return [...fallback];
  return Array.from({ length: COLUMNS }, (_, index) =>
    clampNumber(Math.round((Number(saved[index]) || 0) * 100) / 100, -1, 1),
  );
};

export const definition = defineModule<DrawState, DrawFrame>({
  initialState: { heights: [...READY.wave], cells: 6, practice: 0.5, runs: 0 },
  scene: DrawScene,
  controls: DrawControls,
  captions,
  missions,
  predictions,
  underTheHood: DrawDrawer,
  compare: (state) => ({ ...state, cells: CELLS.min }),
  parseState: (saved, initial) => ({
    heights: heightsOf(saved.heights, initial.heights),
    cells: clampWhole(saved.cells, CELLS.min, CELLS.max),
    practice: clampNumber(saved.practice, 0, 1),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting(cellWords(state.cells));
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(cellWords(state.cells), howClose(state, frame));
  },
  trains: true,
});
