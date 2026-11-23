import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { CatchControls } from "./controls";
import { CatchDrawer } from "./drawer";
import { missions } from "./missions";
import {
  isCurrent,
  MEMORY_STOPS,
  MOST_GAMES,
  RATE_STOPS,
  SMALLEST_MEMORY,
  START,
  type CatchFrame,
  type CatchState,
} from "./model";
import { predictions } from "./predictions";
import { CatchScene } from "./scene";

/** "Start again" can be pressed this often before a link stops counting. */
const MOST_ATTEMPTS = 1_000_000;

export const definition = defineModule<CatchState, CatchFrame>({
  initialState: { ...START, attempt: 0, steps: 0, running: false },
  scene: CatchScene,
  controls: CatchControls,
  captions,
  missions,
  predictions,
  underTheHood: CatchDrawer,
  trains: true,
  // The other end of its memory: none for a player that remembers, lots for one that doesn't.
  compare: (state) => ({
    ...state,
    memory: state.memory === SMALLEST_MEMORY ? MEMORY_STOPS.length - 1 : SMALLEST_MEMORY,
  }),
  parseState: (saved) => ({
    memory: clampWhole(saved.memory, 0, MEMORY_STOPS.length - 1),
    learning: clampWhole(saved.learning, 0, RATE_STOPS.length - 1),
    attempt: clampWhole(saved.attempt, 0, MOST_ATTEMPTS),
    steps: clampWhole(saved.steps, 0, MOST_GAMES),
    // A link never opens practising.
    running: false,
  }),
  describe: (state, frame) => {
    const games = isCurrent(state, frame) ? frame.step : 0;
    return words
      .describe(
        words.games(games, games >= MOST_GAMES),
        isCurrent(state, frame) ? words.catches(frame.catches) : "",
      )
      .trim();
  },
});
