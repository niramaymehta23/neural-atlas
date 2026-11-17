import { TILES } from "@/engine/rl/gridworld";
import { capList, clampNumber, clampWhole, oneOf } from "@/platform/clamp";
import { defineModule } from "@/platform/contract";
import { captions } from "./captions";
import { ScoringControls } from "./controls";
import { describeScoring } from "./describe";
import { ScoringDrawer } from "./drawer";
import { missions } from "./missions";
import { KITCHEN, START, type Edit, type ScoringFrame, type ScoringState } from "./model";
import { predictions } from "./predictions";
import { ScoringScene } from "./scene";

/** The compare side learns slowly, so its scores settle where a fast learner's keep jumping. */
const STEADY = 0.2;
/** A link replays at most this many moves (about ten minutes at full speed) and edits. */
export const MOST_MOVES = 2_000_000;
export const MOST_EDITS = 2_000;
const MOST_TRIES = 50_000;

const unit = (value: unknown) => (typeof value === "number" ? clampNumber(value, 0, 1) : 0);

/** An edit from a link, made safe: whole moves in range, a board string, dials on their dials. */
function isEdit(value: unknown): value is Edit {
  if (typeof value !== "object" || value === null) return false;
  const edit = value as Partial<Edit>;
  return (
    typeof edit.moves === "number" &&
    Number.isFinite(edit.moves) &&
    typeof edit.board === "string" &&
    Array.isArray(edit.dials) &&
    edit.dials.length === 3 &&
    edit.dials.every((dial) => typeof dial === "number" && Number.isFinite(dial))
  );
}

/** A link's edits in order of the move they happened at, each one clamped. */
function parseLog(log: readonly unknown[]): Edit[] {
  let last = 0;
  return capList(log, MOST_EDITS, isEdit).map((edit) => {
    last = clampWhole(Math.max(last, edit.moves), 0, MOST_MOVES);
    return {
      moves: last,
      board: edit.board.slice(0, KITCHEN.length),
      dials: [unit(edit.dials[0]), unit(edit.dials[1]), unit(edit.dials[2])],
    };
  });
}

export const definition = defineModule<ScoringState, ScoringFrame>({
  initialState: {
    tiles: KITCHEN,
    curiosity: 0.2,
    learnRate: 0.4,
    lookAhead: 0.9,
    // About a dozen moves a second: a trot you can still follow (QL-11).
    speed: 0.2,
    brush: "wall",
    playing: false,
    moves: 0,
    episodes: 0,
    attempt: 0,
    log: [],
  },
  scene: ScoringScene,
  controls: ScoringControls,
  captions,
  missions,
  predictions,
  underTheHood: ScoringDrawer,
  compare: (state) => ({
    ...state,
    learnRate: STEADY,
    log: state.log.map((edit) => ({ ...edit, dials: [edit.dials[0], STEADY, edit.dials[2]] })),
  }),
  describe: describeScoring,
  // The board keeps its size and the puppy's corner; dials stay on their dials; the run replays
  // to a bounded move.
  parseState: (saved, initial) => {
    const log = parseLog(saved.log);
    return {
      ...saved,
      tiles: initial.tiles.map((fallback, index) =>
        index === START ? fallback : oneOf(saved.tiles[index], TILES, fallback),
      ),
      curiosity: clampNumber(saved.curiosity, 0, 1),
      learnRate: clampNumber(saved.learnRate, 0, 1),
      lookAhead: clampNumber(saved.lookAhead, 0, 1),
      speed: clampNumber(saved.speed, 0, 1),
      brush: oneOf(saved.brush, TILES, initial.brush),
      moves: clampWhole(Math.max(saved.moves, log.at(-1)?.moves ?? 0), 0, MOST_MOVES),
      episodes: clampWhole(saved.episodes, 0, MOST_TRIES),
      attempt: clampWhole(saved.attempt, 0, 1_000_000),
      log,
    };
  },
  trains: true,
});
