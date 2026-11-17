import { outOf } from "@/design/copy";
import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { StartControls } from "./controls";
import { StartDrawer } from "./drawer";
import { missions } from "./missions";
import { CELLS, DOTS, isFinished, type StartFrame, type StartState } from "./model";
import { predictions } from "./predictions";
import { cellsSentence, StartScene } from "./scene";

const MOST_SPINS = 10_000;

export const definition = defineModule<StartState, StartFrame>({
  initialState: { wild: 0.5, cells: 3, same: false, spins: 0 },
  scene: StartScene,
  controls: StartControls,
  captions,
  missions,
  predictions,
  underTheHood: StartDrawer,
  compare: (state) => ({ ...state, spins: state.spins + 1 }),
  // A link's dials stay on their dials, and its spin count stays sane.
  parseState: (saved) => ({
    wild: clampNumber(Number(saved.wild) || 0, 0, 1),
    cells: clampWhole(Number(saved.cells) || 0, CELLS.min, CELLS.max),
    same: saved.same === true,
    spins: clampWhole(Number(saved.spins) || 0, 0, MOST_SPINS),
  }),
  describe: (state, frame) => {
    if (state.spins === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.practising;
    return words.describe.done(
      outOf(frame.right / DOTS.length, { total: DOTS.length }),
      cellsSentence(state.cells, frame.params),
    );
  },
  trains: true,
});
