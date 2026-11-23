import { clampNumber, clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { PracticeControls } from "./controls";
import { PracticeDrawer } from "./drawer";
import { missions } from "./missions";
import {
  DEFAULT_CURIOSITY,
  DEFAULT_GAMES,
  GAMES,
  isFinished,
  type PracticeFrame,
  type PracticeState,
} from "./model";
import { predictions } from "./predictions";
import { PracticeScene } from "./scene";

const MOST_RUNS = 10_000;

export const definition = defineModule<PracticeState, PracticeFrame>({
  initialState: { games: DEFAULT_GAMES, curiosity: DEFAULT_CURIOSITY, frozen: false, runs: 0 },
  scene: PracticeScene,
  controls: PracticeControls,
  captions,
  missions,
  predictions,
  underTheHood: PracticeDrawer,
  // Pop frozen against Pop learning, everything else the same.
  compare: (state) => ({ ...state, frozen: !state.frozen }),
  parseState: (saved) => ({
    games: clampWhole(saved.games, 0, GAMES.length - 1),
    // On the dial's own steps, so a link turns the dial to a place it can rest.
    curiosity: Math.round(clampNumber(saved.curiosity, 0, 1) * 20) / 20,
    frozen: saved.frozen === true,
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    if (state.runs === 0) return words.describe.waiting;
    if (!isFinished(state, frame)) return words.describe.working;
    return words.describe.done(
      frame.pipShare === null ? "" : words.result.partner(frame.pipShare),
      words.result.newcomer(frame.testShare),
    );
  },
  trains: true,
});
