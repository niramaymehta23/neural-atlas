import { count, sentenceStart } from "@/design/copy";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CurveControls } from "./controls";
import { CurveDrawer } from "./drawer";
import { missions } from "./missions";
import { BENDS, CELLS, isFinished, SHAPES, type CurveFrame, type CurveState } from "./model";
import { predictions } from "./predictions";
import { CurveScene, howClose } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<CurveState, CurveFrame>({
  initialState: { bend: "tanh", shape: "wave", step: 0.5, cells: 6, runs: 0 },
  scene: CurveScene,
  controls: CurveControls,
  captions,
  missions,
  predictions,
  underTheHood: CurveDrawer,
  compare: (state) => ({ ...state, bend: state.bend === "identity" ? "tanh" : "identity" }),
  parseState: (saved, initial) => ({
    bend: oneOf(saved.bend, BENDS, initial.bend),
    shape: oneOf(saved.shape, SHAPES, initial.shape),
    step: clampNumber(saved.step, 0, 1),
    cells: clampWhole(saved.cells, CELLS.min, CELLS.max),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    const bend = words.bend.names[state.bend];
    if (state.runs === 0)
      return words.describe.waiting(
        bend,
        sentenceStart(state.cells === 1 ? words.cells.one : words.cells.many(count(state.cells))),
      );
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(bend, howClose(state, frame));
  },
  trains: true,
});
