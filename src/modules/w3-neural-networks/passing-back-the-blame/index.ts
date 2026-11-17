import { count } from "@/design/copy";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { BlameControls } from "./controls";
import { BlameDrawer } from "./drawer";
import { missions } from "./missions";
import { BENDS, CELLS, isFinished, LAYERS, type BlameFrame, type BlameState } from "./model";
import { predictions } from "./predictions";
import { BlameScene, reachWords } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<BlameState, BlameFrame>({
  initialState: { layers: 2, bend: "sigmoid", step: 0.3, runs: 0 },
  scene: BlameScene,
  controls: BlameControls,
  captions,
  missions,
  predictions,
  underTheHood: BlameDrawer,
  compare: (state) => ({ ...state, bend: state.bend === "sigmoid" ? "leakyRelu" : "sigmoid" }),
  parseState: (saved, initial) => ({
    layers: clampWhole(saved.layers, LAYERS.min, LAYERS.max),
    bend: oneOf(saved.bend, BENDS, initial.bend),
    step: clampNumber(saved.step, 0, 1),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0)
      return words.describe.waiting(
        count(CELLS),
        state.layers === 1 ? words.layers.one : words.layers.many(count(state.layers)),
      );
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(reachWords(frame));
  },
  trains: true,
});
