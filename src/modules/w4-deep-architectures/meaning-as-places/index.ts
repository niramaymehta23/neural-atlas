import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { MapControls } from "./controls";
import { MapDrawer } from "./drawer";
import { missions } from "./missions";
import { isFinished, type MapFrame, type MapState } from "./model";
import { predictions } from "./predictions";
import { MapScene, mapLine } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<MapState, MapFrame>({
  initialState: { push: 0.4, step: 0.5, runs: 0 },
  scene: MapScene,
  controls: MapControls,
  captions,
  missions,
  predictions,
  underTheHood: MapDrawer,
  // No pushing against some, so the squashed map and a spread one sit side by side.
  compare: (state) => ({ ...state, push: state.push === 0 ? 0.4 : 0 }),
  parseState: (saved) => ({
    push: clampNumber(saved.push, 0, 1),
    step: clampNumber(saved.step, 0, 1),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(mapLine(frame));
  },
  trains: true,
});
