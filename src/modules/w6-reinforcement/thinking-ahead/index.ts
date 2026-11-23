import { legalMoves } from "@/engine/rl/connect-four";
import { clampWhole } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { AheadControls } from "./controls";
import { describeAhead } from "./describe";
import { AheadDrawer } from "./drawer";
import { missions } from "./missions";
import {
  DEFAULT_FUTURES,
  DEFAULT_LENGTH,
  FUTURES,
  LENGTHS,
  ONE_MOVE_AHEAD,
  type AheadFrame,
  type AheadState,
} from "./model";
import { predictions } from "./predictions";
import { AheadScene } from "./scene";

export const definition = defineModule<AheadState, AheadFrame>({
  initialState: { moves: [], futures: DEFAULT_FUTURES, length: DEFAULT_LENGTH },
  scene: AheadScene,
  controls: AheadControls,
  captions,
  missions,
  predictions,
  underTheHood: AheadDrawer,
  // One move ahead against thousands of pretend games, thinking about the same board.
  compare: (state) => ({
    ...state,
    futures: state.futures === ONE_MOVE_AHEAD ? DEFAULT_FUTURES : ONE_MOVE_AHEAD,
  }),
  // A link's game is kept up to its first move that cannot be played (at most a full board).
  parseState: (saved) => ({
    moves: legalMoves(saved.moves),
    futures: clampWhole(saved.futures, 0, FUTURES.length - 1),
    length: clampWhole(saved.length, 0, LENGTHS.length - 1),
  }),
  describe: describeAhead,
});
