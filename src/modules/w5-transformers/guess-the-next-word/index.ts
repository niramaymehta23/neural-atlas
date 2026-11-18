import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { NextControls } from "./controls";
import { NextDrawer } from "./drawer";
import { missions } from "./missions";
import {
  MOST_ADDED,
  MOST_LETTERS,
  MOST_SEED,
  storyWords,
  type NextFrame,
  type NextState,
} from "./model";
import { predictions } from "./predictions";
import { NextScene } from "./scene";

export const definition = defineModule<NextState, NextFrame>({
  initialState: { start: words.example, added: 0, likeliest: false, seed: 1 },
  scene: NextScene,
  controls: NextControls,
  captions,
  missions,
  predictions,
  underTheHood: NextDrawer,
  compare: (state) => ({ ...state, likeliest: !state.likeliest }),
  parseState: (saved) => ({
    start: saved.start.slice(0, MOST_LETTERS),
    added: clampWhole(saved.added, 0, MOST_ADDED),
    likeliest: saved.likeliest,
    seed: clampWhole(saved.seed, 1, MOST_SEED),
  }),
  describe: (state, frame) => {
    if (!frame) return words.describe.waiting;
    const top = frame.next[0]?.word;
    if (!frame.known || !top) return words.describe.unknown;
    return words.describe.done([...storyWords(state.start), ...frame.written].join(" "), top);
  },
});
