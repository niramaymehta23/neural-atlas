import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CoachControls } from "./controls";
import { CoachDrawer } from "./drawer";
import { missions } from "./missions";
import {
  isCurrent,
  MOST_BATCHES,
  MOST_ROUNDS,
  NO_RAIL,
  START,
  type CoachFrame,
  type CoachState,
} from "./model";
import { predictions } from "./predictions";
import { CoachScene } from "./scene";

/** "Start again" can be pressed this often before a link stops counting. */
const MOST_ATTEMPTS = 1_000_000;

export const definition = defineModule<CoachState, CoachFrame>({
  initialState: { ...START, attempt: 0, steps: 0, running: false },
  scene: CoachScene,
  controls: CoachControls,
  captions,
  missions,
  predictions,
  underTheHood: CoachDrawer,
  trains: true,
  // The rail switched the other way: off for a player with one, the usual rail for one without.
  compare: (state) => ({ ...state, clip: state.clip === NO_RAIL ? START.clip : NO_RAIL }),
  parseState: (saved) => ({
    clip: clampWhole(saved.clip, 0, NO_RAIL),
    rounds: clampWhole(saved.rounds, 0, MOST_ROUNDS),
    attempt: clampWhole(saved.attempt, 0, MOST_ATTEMPTS),
    steps: clampWhole(saved.steps, 0, MOST_BATCHES),
    // A link never opens practising.
    running: false,
  }),
  describe: (state, frame) => {
    const batches = isCurrent(state, frame) ? frame.step : 0;
    return words
      .describe(
        words.batches(batches, batches >= MOST_BATCHES),
        isCurrent(state, frame) && batches > 0 ? words.score(frame.score) : "",
      )
      .trim();
  },
});
