import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { LookingControls } from "./controls";
import { LookingDrawer } from "./drawer";
import { missions } from "./missions";
import type { LookingFrame, LookingState } from "./model";
import { predictions } from "./predictions";
import { LookingScene } from "./scene";

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
});
