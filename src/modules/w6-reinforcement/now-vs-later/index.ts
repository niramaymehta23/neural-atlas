import { clampNumber } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { NowControls } from "./controls";
import { NowDrawer } from "./drawer";
import { missions } from "./missions";
import { keyOf, PRIZE, workOut, type NowFrame, type NowState } from "./model";
import { predictions } from "./predictions";
import { NowScene } from "./scene";

/** The telescope turned the other way: far-sighted if yours is short-sighted, and back. */
const SHORT = 0.2;
const LONG = 0.95;

export const definition = defineModule<NowState, NowFrame>({
  initialState: { care: 0.6, prize: PRIZE.start },
  scene: NowScene,
  controls: NowControls,
  captions,
  missions,
  predictions,
  underTheHood: NowDrawer,
  compare: (state) => ({ ...state, care: state.care >= 0.5 ? SHORT : LONG }),
  parseState: (saved) => ({
    care: clampNumber(saved.care, 0, 1),
    prize: clampNumber(saved.prize, PRIZE.min, PRIZE.max),
  }),
  describe: (state, frame) =>
    words.heads[
      frame && frame.key === keyOf(state) ? frame.destination : workOut(state).destination
    ],
});
