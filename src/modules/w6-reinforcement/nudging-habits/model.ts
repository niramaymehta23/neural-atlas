/**
 * Nudging habits: a puppy crosses a wide bridge between two lava rivers to its bowl. It has a
 * habit on every square (how likely each move is), starts with even habits, and after every
 * batch of tries nudges them: more of the moves on tries that went better than usual, less of
 * the moves on tries that went worse. A run is a pure function of the dials, the puppy (attempt)
 * and the seed, so a link replays it exactly. The learning is the engine's seeded learner.
 */
import { MOVE_COUNT, type Tile, type World } from "@/engine/rl/gridworld";
import {
  allChances,
  chancesAt,
  createHabitLearner,
  type HabitTry,
} from "@/engine/rl/policy-gradient";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 7;
export const ROWS = 5;
/** Middle of the left edge: where every try begins. */
export const START = 14;

const MARKS: Record<string, Tile> = { "~": "trap", G: "goal" };
/** A wide bridge: lava along the top and bottom, the puppy on the left, its bowl on the right. */
export const BRIDGE: readonly Tile[] = ["~~~~~~~", ".......", "S.....G", ".......", "~~~~~~~"]
  .join("")
  .split("")
  .map((mark) => MARKS[mark] ?? "floor");

export const WORLD: World = { columns: COLUMNS, rows: ROWS, tiles: BRIDGE, start: START };

/** Tries in every run. */
export const TRIES = 600;
/** A frame (one moment on the timeline) every this many tries. */
export const EVERY = 10;
/** How often it reaches the bowl is judged over this many latest tries. */
export const RECENT = 100;
/** Puppy 0 learns from this seed; "Another puppy" moves on one. */
export const SEED = 1;

export const BATCH = { min: 1, max: 20 };
/** "How hard each nudge", 0–1 on the dial, to the size of a nudge: 0.1 to 300, evenly in ratio. */
export const nudgeOf = (dial: number) => 0.1 * 3000 ** Math.min(1, Math.max(0, dial));
/** The starting dial: a firm nudge. */
export const DEFAULT_NUDGE = 0.35;
export const DEFAULT_BATCH = 5;

/**
 * From here up on "How hard each nudge" the habits go wild. Measured (bridge, 600 tries, five
 * tries per nudge, puppies 0–19): at 0.9 eighteen of twenty puppies, and at the top all twenty,
 * end reaching the bowl in fewer than 30 of their last 100 tries, each with a start-square habit
 * at least 99% sure; at the starting 0.35 all twenty reach it in at least 86 of their last 100
 * (at 0.4 one only reached it 78 times, and at 0.45 one locked in at 34).
 */
export const WILD = 0.9;
/** Reaching the bowl less often than this (of the latest tries) is a habit gone wild. */
export const GONE_WILD = 0.3;
/** A start-square habit at least this sure is locked: it always makes the same first move. */
export const LOCKED = 0.99;
/**
 * A random walker on the bridge reaches the bowl in about 1 of 100 tries (measured: 14 of 1000,
 * seed 1); a puppy at the starting dials in at least 86 of its last 100 (puppies 0–19).
 */
export const WALKER_SUCCESS = 0.014;

export type HabitState = {
  /** "How hard each nudge", 0–1. */
  nudge: number;
  /** "Tries per nudge", a whole number. */
  batch: number;
  /** Which puppy: "Another puppy" moves on one (a new seed). */
  attempt: number;
  /** Runs asked for; 0 until the first. A link replays the last one. */
  runs: number;
};

/** The first try that reached the bowl, and what the nudge after it did to its moves. */
export type LuckyTry = {
  /** Which try it was (1 is the first). */
  at: number;
  path: number[];
  /**
   * Whether the nudge after it made that whole try more likely to happen again ("more"), less
   * likely ("less"), or left it as likely ("same").
   */
  then: "more" | "less" | "same";
};

export type HabitFrame = TimelineFrame & {
  key: string;
  /** Tries so far (the frame's epoch). */
  tries: number;
  /** Every square's four chances (up, right, down, left), squares in board order. */
  chances: Float64Array;
  /** Share of the latest tries (up to RECENT) that reached the bowl, 0–1. */
  recent: number;
  /** Share of the latest tries that ended in the lava, 0–1. */
  lava: number;
  /** The squares of the latest try, the start first. */
  path: number[];
  /** How sure its start-square habit is: the biggest of the start square's chances. */
  sure: number;
  /** Known once the nudge after the first bowl try has happened. */
  lucky: LuckyTry | null;
};

export const keyOf = ({ nudge, batch, attempt }: Pick<HabitState, "nudge" | "batch" | "attempt">) =>
  `${nudge}|${batch}|${attempt}`;

const EVEN = new Float64Array(BRIDGE.length * MOVE_COUNT).fill(1 / MOVE_COUNT);

/** The chance of playing exactly the moves of `tried` again under `preferences`. */
const likelihood = (preferences: ArrayLike<number>, tried: HabitTry) =>
  tried.moves.reduce(
    (product, move, at) => product * (chancesAt(preferences, tried.path[at] ?? START)[move] ?? 0),
    1,
  );

/** A result rounded for the screen and links: the same in every browser. */
const rounded = (value: number) => Math.round(value * 1e6) / 1e6;

/** Every moment of the run `state` describes: even habits first, then one frame per EVERY tries. */
export function* habitRun(state: HabitState): Generator<HabitFrame> {
  const key = keyOf(state);
  const learner = createHabitLearner(
    WORLD,
    { nudge: nudgeOf(state.nudge), batch: Math.round(state.batch) },
    SEED + state.attempt,
  );
  const ends: HabitTry["end"][] = [];
  let latest: HabitTry | null = null;
  let lucky: LuckyTry | null = null;
  let pending: { at: number; tried: HabitTry; before: number; nudges: number } | null = null;
  const frame = (tries: number): HabitFrame => {
    const window = ends.slice(-RECENT);
    const share = (end: HabitTry["end"]) =>
      window.length === 0 ? 0 : window.filter((one) => one === end).length / window.length;
    const recent = share("goal");
    return {
      epoch: tries,
      loss: 1 - recent,
      key,
      tries,
      chances: tries === 0 ? EVEN : allChances(learner.preferences, BRIDGE.length),
      recent,
      lava: share("trap"),
      path: latest?.path ?? [START],
      sure: rounded(Math.max(...chancesAt(learner.preferences, START))),
      lucky,
    };
  };
  yield frame(0);
  for (let tries = 1; tries <= TRIES; tries += 1) {
    const nudgesBefore = learner.nudges;
    const before = Float64Array.from(learner.preferences);
    const tried = learner.play();
    latest = tried;
    ends.push(tried.end);
    if (!lucky && !pending && tried.end === "goal")
      pending = { at: tries, tried, before: likelihood(before, tried), nudges: nudgesBefore + 1 };
    if (pending && learner.nudges >= pending.nudges) {
      const after = likelihood(learner.preferences, pending.tried);
      const change = after / pending.before;
      lucky = {
        at: pending.at,
        path: pending.tried.path,
        then: change > 1 + 1e-9 ? "more" : change < 1 - 1e-9 ? "less" : "same",
      };
      pending = null;
    }
    if (tries % EVERY === 0) yield frame(tries);
  }
}

export const isFinished = (state: HabitState, frame: HabitFrame | undefined): frame is HabitFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.tries === TRIES;

/** Its habits have gone wild: one move locked in, and the bowl hardly ever reached. */
export const goneWild = (frame: Pick<HabitFrame, "recent" | "sure">) =>
  frame.recent < GONE_WILD && frame.sure >= LOCKED;

/** The favourite move from every square, −1 where no move stands out (even habits). */
export function favourites(chances: ArrayLike<number>): number[] {
  return BRIDGE.map((_, cell) => {
    const four = Array.from(
      { length: MOVE_COUNT },
      (_, move) => chances[cell * MOVE_COUNT + move] ?? 0,
    );
    const best = Math.max(...four);
    const second = [...four].sort((a, b) => b - a)[1] ?? 0;
    return best - second > 0.02 ? four.indexOf(best) : -1;
  });
}
