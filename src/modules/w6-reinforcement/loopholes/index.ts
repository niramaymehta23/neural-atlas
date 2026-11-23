import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { LoopholeControls } from "./controls";
import { LoopholeDrawer } from "./drawer";
import { missions } from "./missions";
import {
  ALL_LOOPHOLES,
  isFinished,
  type Loophole,
  type LoopholeFrame,
  type LoopholeState,
} from "./model";
import { predictions } from "./predictions";
import { LoopholeScene } from "./scene";

const MOST_RUNS = 10_000;

const isLoophole = (value: unknown): value is Loophole =>
  (ALL_LOOPHOLES as readonly unknown[]).includes(value);

export const definition = defineModule<LoopholeState, LoopholeFrame>({
  initialState: {
    boxTreat: 0.5,
    moveCost: 0.1,
    pickup: false,
    closer: false,
    runs: 0,
    found: [],
  },
  scene: LoopholeScene,
  controls: LoopholeControls,
  captions,
  missions,
  predictions,
  underTheHood: LoopholeDrawer,
  // The same treat for tidying and cost of moving, with no extra treats.
  compare: (state) => ({ ...state, pickup: false, closer: false }),
  parseState: (saved) => ({
    boxTreat: clampNumber(saved.boxTreat, 0, 1),
    moveCost: clampNumber(saved.moveCost, 0, 1),
    pickup: saved.pickup,
    closer: saved.closer,
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
    // Each loophole once, known ones only.
    found: [...new Set(saved.found.filter(isLoophole))],
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(words.behaviour[frame.behaviour]);
  },
  trains: true,
});
