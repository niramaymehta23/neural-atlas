import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { MapControls } from "./controls";
import { MapDrawer } from "./drawer";
import { missions } from "./missions";
import { ACROSS, matches, share, TIDY, type MapFrame, type MapState } from "./model";
import { predictions } from "./predictions";
import { MapScene } from "./scene";

export const definition = defineModule<MapState, MapFrame>({
  initialState: { tidy: TIDY.most, across: 8, x: 0.5, y: 0.5 },
  scene: MapScene,
  controls: MapControls,
  captions,
  missions,
  predictions,
  underTheHood: MapDrawer,
  compare: (state) => ({ ...state, tidy: state.tidy === TIDY.min ? TIDY.most : TIDY.min }),
  parseState: (saved) => ({
    tidy: clampWhole(saved.tidy, TIDY.min, TIDY.most),
    across: clampWhole(saved.across, ACROSS.min, ACROSS.most),
    x: share(saved.x),
    y: share(saved.y),
  }),
  describe: (state, frame) => {
    if (!matches(state, frame)) return words.describe.loading;
    const tidy = words.tidy.names[state.tidy] ?? words.tidy.names[0];
    return frame.nonsense ? words.describe.nonsense(tidy) : words.describe.face(tidy);
  },
});
