import { reachability } from "@/engine/rl/gridworld";
import { keepTiles } from "@/features/rl/boards";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions, words } from "./captions";
import { GlowControls } from "./controls";
import { GlowDrawer } from "./drawer";
import { missions } from "./missions";
import {
  BRUSHES,
  GARDEN,
  keyOf,
  SPREADS_PER_SECOND,
  START,
  WARM,
  worldOf,
  type GlowFrame,
  type GlowState,
} from "./model";
import { predictions } from "./predictions";
import { GlowScene } from "./scene";

/** A link asks for at most this many glows (each one is a few dozen sweeps). */
export const MOST_RUNS = 10_000;
/** The far-sight turned the other way: short if yours is long, and back. */
const SHORT = 0.3;
const LONG = 0.95;

export const definition = defineModule<GlowState, GlowFrame>({
  initialState: { tiles: GARDEN, care: 0.9, slippery: 0, brush: "wall", runs: 0 },
  scene: GlowScene,
  controls: GlowControls,
  captions,
  missions,
  predictions,
  underTheHood: GlowDrawer,
  compare: (state) => ({ ...state, care: state.care >= 0.5 ? SHORT : LONG }),
  parseState: (saved, initial) => ({
    tiles: keepTiles(saved.tiles, initial.tiles, START, BRUSHES),
    care: clampNumber(saved.care, 0, 1),
    slippery: clampNumber(saved.slippery, 0, 1),
    brush: oneOf(saved.brush, BRUSHES, initial.brush),
    runs: clampWhole(saved.runs, 0, MOST_RUNS),
  }),
  describe: (state, frame) => {
    const bowl = reachability(worldOf(state.tiles));
    if (bowl !== "reachable") return words.bowl[bowl];
    if (state.runs === 0 || !frame || frame.key !== keyOf(state)) return words.waiting;
    const corner = (frame.values[START] ?? 0) >= WARM ? words.corner.warm : words.corner.cold;
    return `${words.spreads(frame.epoch)} ${corner}`;
  },
  trains: true,
  framesPerSecond: SPREADS_PER_SECOND,
});
