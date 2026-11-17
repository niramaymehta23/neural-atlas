import { clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SureControls } from "./controls";
import { SureDrawer } from "./drawer";
import { missions } from "./missions";
import { DEFAULT_BOAST, sureAndWrong, type SureState } from "./model";
import { predictions } from "./predictions";
import { lensSentence, SureScene } from "./scene";

export const definition = defineModule<SureState>({
  initialState: { boast: DEFAULT_BOAST, overlap: 0.4, lens: { x: -0.5, y: 0.5 }, looked: false },
  scene: SureScene,
  controls: SureControls,
  captions,
  missions,
  predictions,
  underTheHood: SureDrawer,
  compare: (state) => ({ ...state, boast: 0 }),
  parseState: (saved) => ({
    boast: clampNumber(Number(saved.boast) || 0, 0, 1),
    overlap: clampNumber(Number(saved.overlap) || 0, 0, 1),
    lens: {
      x: clampNumber(Number(saved.lens?.x) || 0, -1, 1),
      y: clampNumber(Number(saved.lens?.y) || 0, -1, 1),
    },
    looked: saved.looked === true,
  }),
  describe: (state) =>
    words.describe(lensSentence(state), sureAndWrong(state) ? words.certainWrong : ""),
});
