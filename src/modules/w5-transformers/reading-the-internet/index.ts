import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, TEXTS, words } from "./captions";
import { ReadingControls } from "./controls";
import { ReadingDrawer } from "./drawer";
import { missions } from "./missions";
import { LEARNING, MOST_LETTERS, MOST_STEPS, type ReadingFrame, type ReadingState } from "./model";
import { predictions } from "./predictions";
import { ReadingScene } from "./scene";

export const definition = defineModule<ReadingState, ReadingFrame>({
  initialState: { text: TEXTS.rhymes, learning: LEARNING.start, steps: 0, running: false },
  scene: ReadingScene,
  controls: ReadingControls,
  captions,
  missions,
  predictions,
  underTheHood: ReadingDrawer,
  trains: true,
  compare: (state) => ({
    ...state,
    learning: state.learning >= 0.006 ? LEARNING.start : LEARNING.max,
    running: false,
  }),
  parseState: (saved) => ({
    text: saved.text.slice(0, MOST_LETTERS),
    learning: clampNumber(saved.learning, LEARNING.min, LEARNING.max),
    steps: clampWhole(saved.steps, 0, MOST_STEPS),
    // A link never opens practising.
    running: false,
  }),
  describe: (_state, frame) =>
    frame
      ? words.describe.done(words.steps(frame.step, frame.step >= MOST_STEPS), frame.sample)
      : words.describe.waiting,
});
