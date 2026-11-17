import { TILES } from "@/engine/rl/gridworld";
import { clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { ScoringControls } from "./controls";
import { ScoringDrawer } from "./drawer";
import { missions } from "./missions";
import { KITCHEN, START, type ScoringFrame, type ScoringState } from "./model";
import { predictions } from "./predictions";
import { ScoringScene } from "./scene";

/** The compare side learns slowly, so its scores settle where a fast learner's keep jumping. */
const STEADY = 0.2;

export const definition = defineModule<ScoringState, ScoringFrame>({
  initialState: {
    tiles: KITCHEN,
    curiosity: 0.2,
    learnRate: 0.4,
    lookAhead: 0.9,
    speed: 0.5,
    brush: "wall",
    playing: false,
    episodes: 0,
    attempt: 0,
  },
  scene: ScoringScene,
  controls: ScoringControls,
  captions,
  missions,
  predictions,
  underTheHood: ScoringDrawer,
  compare: (state) => ({ ...state, learnRate: STEADY }),
  // The board keeps its size and the puppy's corner; dials stay on their dials.
  parseState: (saved, initial) => ({
    ...saved,
    tiles: initial.tiles.map((fallback, index) =>
      index === START ? fallback : oneOf(saved.tiles[index], TILES, fallback),
    ),
    curiosity: clampNumber(saved.curiosity, 0, 1),
    learnRate: clampNumber(saved.learnRate, 0, 1),
    lookAhead: clampNumber(saved.lookAhead, 0, 1),
    speed: clampNumber(saved.speed, 0, 1),
    brush: oneOf(saved.brush, TILES, initial.brush),
    episodes: clampWhole(saved.episodes, 0, 5000),
    attempt: clampWhole(saved.attempt, 0, 1_000_000),
  }),
  trains: true,
});
