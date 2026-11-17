import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { LookingControls } from "./controls";
import { LookingDrawer } from "./drawer";
import { missions } from "./missions";
import { DEPTHS, READERS, type LookingFrame, type LookingState } from "./model";
import { predictions } from "./predictions";
import { LookingScene } from "./scene";

/** The scene's sentence box allows this many letters. */
const MAX_LETTERS = 90;

export const definition = defineModule<LookingState, LookingFrame>({
  initialState: {
    sentence: words.example,
    depth: 4,
    reader: 0,
    // "it": the word whose threads answer the guess.
    focus: 8,
  },
  scene: LookingScene,
  controls: LookingControls,
  captions,
  missions,
  predictions,
  underTheHood: LookingDrawer,
  compare: (state) => ({ ...state, reader: 0 }),
  // The sentence box holds 90 letters; the dials stay on their dials.
  parseState: (saved) => ({
    sentence: saved.sentence.slice(0, MAX_LETTERS),
    depth: clampWhole(saved.depth, 1, DEPTHS),
    reader: clampWhole(saved.reader, 0, READERS),
    focus: clampWhole(saved.focus, -1, MAX_LETTERS),
  }),
});
