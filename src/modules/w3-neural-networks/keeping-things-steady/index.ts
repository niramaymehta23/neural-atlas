import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SteadyControls } from "./controls";
import { SteadyDrawer } from "./drawer";
import { missions } from "./missions";
import {
  isFinished,
  LAYERS,
  outcomeOf,
  signalsAtEnd,
  type SteadyFrame,
  type SteadyState,
} from "./model";
import { predictions } from "./predictions";
import { SteadyScene } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<SteadyState, SteadyFrame>({
  initialState: { layers: 3, wild: 0.2, calm: false, runs: 0 },
  scene: SteadyScene,
  controls: SteadyControls,
  captions,
  missions,
  predictions,
  underTheHood: SteadyDrawer,
  compare: (state) => ({ ...state, calm: true }),
  // A link's dials stay on their dials, and its run count stays sane.
  parseState: (saved) => ({
    layers: clampWhole(Number(saved.layers) || 0, LAYERS.min, LAYERS.max),
    wild: clampNumber(Number(saved.wild) || 0, 0, 1),
    calm: saved.calm === true,
    runs: clampWhole(Number(saved.runs) || 0, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.practising;
    return words.describe.done(
      words.outcome[outcomeOf(frame)],
      words.signals[signalsAtEnd(state, frame.params)],
    );
  },
  trains: true,
});
