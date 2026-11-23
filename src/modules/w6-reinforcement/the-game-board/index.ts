import { TILES } from "@/engine/rl/gridworld";
import { keepTiles } from "@/features/rl/boards";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { GameBoardControls } from "./controls";
import { GameBoardDrawer } from "./drawer";
import { missions } from "./missions";
import { HOME, keyOf, START, workOut, worldOf, type BoardFrame, type BoardState } from "./model";
import { predictions } from "./predictions";
import { GameBoardScene, tripLine } from "./scene";

/** A link asks for at most this many walks (each is one seeded walk, worked out at once). */
export const MOST_WALKS = 100_000;

export const definition = defineModule<BoardState, BoardFrame>({
  initialState: { tiles: HOME, slippery: 0.2, tiring: 0.1, brush: "trap", walks: 0 },
  scene: GameBoardScene,
  controls: GameBoardControls,
  captions,
  missions,
  predictions,
  underTheHood: GameBoardDrawer,
  // The other floor: still if yours slides at all, very slippery if yours is still.
  compare: (state) => ({ ...state, slippery: state.slippery > 0 ? 0 : 1 }),
  parseState: (saved, initial) => ({
    tiles: keepTiles(saved.tiles, initial.tiles, START),
    slippery: clampNumber(saved.slippery, 0, 1),
    tiring: clampNumber(saved.tiring, 0, 1),
    brush: oneOf(saved.brush, TILES, initial.brush),
    walks: clampWhole(saved.walks, 0, MOST_WALKS),
  }),
  // Read from the view on screen when it matches (the scene works it out once per change).
  describe: (state, frame) => {
    const shown = frame && frame.key === keyOf(state) ? frame : workOut(state);
    const line = tripLine(worldOf(state.tiles), shown);
    const traps = shown.traps.length;
    return traps > 0 ? `${line} ${words.describe.traps(traps)}` : line;
  },
});
