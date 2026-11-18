import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, PIRATE, words } from "./captions";
import { TuneControls } from "./controls";
import { TuneDrawer } from "./drawer";
import { missions } from "./missions";
import {
  LEARNING,
  MOST_LETTERS,
  MOST_MIX,
  MOST_STEPS,
  talksLikeAPirate,
  type TuneFrame,
  type TuneState,
} from "./model";
import { predictions } from "./predictions";
import { TuneScene } from "./scene";

export const definition = defineModule<TuneState, TuneFrame>({
  initialState: { text: PIRATE, learning: LEARNING.start, mix: 0, steps: 0, running: false },
  scene: TuneScene,
  controls: TuneControls,
  captions,
  missions,
  predictions,
  underTheHood: TuneDrawer,
  trains: true,
  compare: (state) => ({ ...state, mix: state.mix >= 0.25 ? 0 : 0.5, running: false }),
  parseState: (saved) => ({
    text: saved.text.slice(0, MOST_LETTERS),
    learning: clampNumber(saved.learning, LEARNING.min, LEARNING.max),
    mix: clampNumber(saved.mix, 0, MOST_MIX),
    steps: clampWhole(saved.steps, 0, MOST_STEPS),
    // A link never opens practising.
    running: false,
  }),
  describe: (_state, frame) =>
    frame
      ? words.describe.done(
          words.steps(frame.step, frame.step >= MOST_STEPS),
          words.pirate(talksLikeAPirate(frame.sample)),
          words.everyday(frame.everyday),
        )
      : words.describe.waiting,
});
