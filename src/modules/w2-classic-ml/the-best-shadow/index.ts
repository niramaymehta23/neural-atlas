import { outOf } from "@/design/copy";
import { clampNumber, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { ShadowControls } from "./controls";
import { ShadowDrawer } from "./drawer";
import { missions } from "./missions";
import { bestDials, CLOUDS, shareOf, type ShadowState } from "./model";
import { predictions } from "./predictions";
import { ShadowScene } from "./scene";

export const definition = defineModule<ShadowState>({
  initialState: { cloud: "pancake", turn: 0.1, tip: 0.3 },
  scene: ShadowScene,
  controls: ShadowControls,
  captions,
  missions,
  predictions,
  underTheHood: ShadowDrawer,
  compare: (state) => ({ ...state, ...bestDials(state.cloud) }),
  parseState: (saved, initial) => ({
    cloud: oneOf(saved.cloud, CLOUDS, initial.cloud),
    turn: clampNumber(saved.turn, 0, 1),
    tip: clampNumber(saved.tip, 0, 1),
  }),
  describe: (state) =>
    words.describe(words.clouds[state.cloud], words.keeps(outOf(shareOf(state), { noun: "" }))),
});
