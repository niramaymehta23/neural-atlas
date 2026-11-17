import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { MOST_WORDS } from "@/engine/pretrained/attention";
import { captions, words } from "./captions";
import { LookingControls } from "./controls";
import { describeLooking } from "./describe";
import { LookingDrawer } from "./drawer";
import { missions } from "./missions";
import {
  compareState,
  DEPTHS,
  MOST_LETTERS,
  READERS,
  type LookingFrame,
  type LookingState,
} from "./model";
import { predictions } from "./predictions";
import { LookingScene } from "./scene";

export const definition = defineModule<LookingState, LookingFrame>({
  initialState: {
    sentence: words.example,
    depth: 4,
    reader: 0,
    // "it": the word whose threads answer the guess.
    focus: 8,
    gallery: false,
  },
  scene: LookingScene,
  controls: LookingControls,
  captions,
  missions,
  predictions,
  underTheHood: LookingDrawer,
  compare: compareState,
  describe: describeLooking,
  // The sentence box holds 90 letters and 16 words are read; the dials stay on their dials.
  parseState: (saved) => ({
    sentence: saved.sentence.slice(0, MOST_LETTERS),
    depth: clampWhole(saved.depth, 1, DEPTHS),
    reader: clampWhole(saved.reader, 0, READERS),
    focus: clampWhole(saved.focus, -1, MOST_WORDS - 1),
    gallery: saved.gallery,
  }),
});
