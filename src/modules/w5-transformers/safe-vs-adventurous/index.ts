import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { SamplingControls } from "./controls";
import { SamplingDrawer } from "./drawer";
import { missions } from "./missions";
import {
  ALL,
  MOST_HEAT,
  MOST_LETTERS,
  MOST_SEED,
  type SamplingFrame,
  type SamplingState,
} from "./model";
import { predictions } from "./predictions";
import { SamplingScene } from "./scene";

export const definition = defineModule<SamplingState, SamplingFrame>({
  initialState: { start: words.example, heat: 1, choices: ALL, seed: 1 },
  scene: SamplingScene,
  controls: SamplingControls,
  captions,
  missions,
  predictions,
  underTheHood: SamplingDrawer,
  compare: (state) => ({ ...state, heat: 1, choices: ALL }),
  parseState: (saved) => ({
    start: saved.start.slice(0, MOST_LETTERS),
    heat: clampNumber(saved.heat, 0, MOST_HEAT),
    choices: clampWhole(saved.choices, 1, ALL),
    seed: clampWhole(saved.seed, 1, MOST_SEED),
  }),
  describe: (_state, frame) => {
    if (!frame) return words.describe.waiting;
    if (!frame.known) return words.describe.unknown;
    return words.describe.done(frame.story.join(" "), words.surprise(frame.surprise));
  },
});
