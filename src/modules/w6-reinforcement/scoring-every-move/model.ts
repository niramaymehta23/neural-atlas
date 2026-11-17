/**
 * The puppy's board, the dials as Q-learning settings, what each finished try leaves on the
 * timeline, and the edit log that lets a shared link replay the run exactly. The learning itself
 * is the engine's seeded Q-learning runner.
 */
import { isEnd, landing, reachability, TILES, type Tile, type World } from "@/engine/rl/gridworld";
import {
  bestMove,
  bestPath,
  createQRunner,
  type Episode,
  type LearnerSettings,
  type QRunner,
} from "@/engine/rl/q-learning";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 7;
export const ROWS = 5;
/** Bottom left: where every try begins. */
export const START = 28;
/** Every run with the same attempt number plays out the same way. */
export const SEED = 11;

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap", c: "coin" };
/** A kitchen board: lava along the bottom between the puppy and its bowl. */
export const KITCHEN: Tile[] = [".......", ".......", "..#.#..", ".......", "S~~~~~G"].flatMap(
  (row) => [...row].map((mark) => MARKS[mark] ?? "floor"),
);

/**
 * One change the learner made, at the move it happened: the whole board and the three learning
 * dials as they were from then on. Replaying these in order rebuilds the run exactly.
 */
export type Edit = { moves: number; board: string; dials: [number, number, number] };

export type ScoringState = {
  tiles: Tile[];
  /** Dials, 0–1: "How curious", "How fast it learns", "How far ahead it cares", "How fast to play". */
  curiosity: number;
  learnRate: number;
  lookAhead: number;
  speed: number;
  brush: Tile;
  playing: boolean;
  /** Moves taken in this run, so a shared link can replay it to the same moment. */
  moves: number;
  /** Finished tries so far (links made before `moves` existed replay this many). */
  episodes: number;
  /** A fresh start forgets every score. */
  attempt: number;
  /** Every board and dial change in this run, oldest first. */
  log: Edit[];
};

export type ScoringFrame = TimelineFrame & {
  reward: number;
  /** Every square's four move scores after this try. */
  q: Float64Array;
  path: number[];
  tiles: readonly Tile[];
  /** How much the scores are still jumping about, smoothed over recent tries. */
  wobble: number;
  /** Tries in a row played with no curiosity at all. */
  incurious: number;
};

export const worldOf = (tiles: readonly Tile[]): World => ({
  columns: COLUMNS,
  rows: ROWS,
  tiles,
  start: START,
});

type Dials = Pick<ScoringState, "curiosity" | "learnRate" | "lookAhead">;

export const settingsOf = ({ curiosity, learnRate, lookAhead }: Dials): LearnerSettings => ({
  curiosity: curiosity * 0.5,
  learnRate: 0.05 + learnRate * 0.95,
  lookAhead: 0.5 + lookAhead * 0.49,
});

/** The "How curious" dial a learner's settings came from. */
export const curiosityDial = (settings: LearnerSettings) => settings.curiosity / 0.5;

/** "How curious" below this is no curiosity at all. */
export const NEVER_CURIOUS = 0.02;
/** "How fast it learns" from here up rewrites a score at once (and is too fast to settle). */
export const TOO_FAST = 0.85;

/** Moves per second: from a walk you can follow to a blur. */
export const movesPerSecond = (speed: number) => 3 * 1000 ** speed;

/** How much food `steps` moves away counts, next to food right here (the telescope). */
export const foresight = (lookAhead: number, steps: number) =>
  settingsOf({ curiosity: 0, learnRate: 0, lookAhead }).lookAhead ** steps;

const WOBBLE_MEMORY = 0.9;

/** The frame a finished try leaves, carrying the wobble on from the previous one. */
export function frameFor(
  episode: Episode,
  q: Float64Array,
  tiles: readonly Tile[],
  previous: ScoringFrame | undefined,
  curiosity = 1,
): ScoringFrame {
  const wobble =
    (previous?.wobble ?? episode.jump) * WOBBLE_MEMORY + episode.jump * (1 - WOBBLE_MEMORY);
  return {
    epoch: episode.index,
    loss: -episode.reward,
    reward: episode.reward,
    q: q.slice(),
    path: episode.path,
    tiles,
    wobble,
    incurious: curiosity < NEVER_CURIOUS ? (previous?.incurious ?? 0) + 1 : 0,
  };
}

/** The frame a try leaves as it finishes in `runner` (its scores, board and curiosity now). */
export const tryFrame = (episode: Episode, runner: QRunner, previous: ScoringFrame | undefined) =>
  frameFor(episode, runner.q, runner.world.tiles, previous, curiosityDial(runner.settings));

/** Squares beside the lava, where one slip ends the try. */
export function besideTrap(tiles: readonly Tile[], cell: number): boolean {
  const row = Math.floor(cell / COLUMNS);
  const column = cell % COLUMNS;
  return [
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ].some(
    ([r = -1, c = -1]) =>
      r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && tiles[r * COLUMNS + c] === "trap",
  );
}

/** The squares its best moves walk through, start and end left out. */
export function plannedPath(frame: Pick<ScoringFrame, "q" | "tiles">): number[] {
  const path = bestPath(worldOf(frame.tiles), frame.q);
  const reached = frame.tiles[path.at(-1) ?? START] === "goal";
  return reached ? path.slice(1, -1).filter((cell) => !isEnd(frame.tiles[cell])) : [];
}

/** True when its best moves lead round and round a loop that passes over a treat. */
export function pacesOnTreats({ q, tiles }: Pick<ScoringFrame, "q" | "tiles">): boolean {
  const world = worldOf(tiles);
  const path = bestPath(world, q);
  const last = path.at(-1) ?? START;
  if (isEnd(tiles[last])) return false;
  const next = landing(world, last, bestMove(q, last));
  const loop = path.indexOf(next);
  return loop >= 0 && path.slice(loop).some((cell) => tiles[cell] === "coin");
}

/** Whether the board has a bowl the puppy can reach. */
export const bowlFor = (tiles: readonly Tile[]) => reachability(worldOf(tiles));

/** How strongly the board's value tint shows: it fades in over the first tries. */
export const HEAT_TRIES = 40;
export const heat = (tries: number) => Math.min(1, Math.max(0, tries / HEAT_TRIES));

const TILE_MARK: Record<Tile, string> = { floor: ".", wall: "#", goal: "G", trap: "~", coin: "c" };
const MARK_TILE = Object.fromEntries(Object.entries(TILE_MARK).map(([tile, mark]) => [mark, tile]));

/** A board as one short string, a character per square (for the edit log). */
export const encodeBoard = (tiles: readonly Tile[]) =>
  tiles.map((tile) => TILE_MARK[tile]).join("");

/** A board back from its string; anything unknown, or a short string, falls back to `fallback`. */
export function decodeBoard(board: string, fallback: readonly Tile[]): Tile[] {
  return fallback.map((tile, index) => {
    if (index === START) return tile;
    const decoded = MARK_TILE[board[index] ?? ""] as Tile | undefined;
    return decoded && TILES.includes(decoded) ? decoded : tile;
  });
}

const dialsOf = ({ curiosity, learnRate, lookAhead }: Dials): Edit["dials"] => [
  curiosity,
  learnRate,
  lookAhead,
];
const sameEdit = (a: Omit<Edit, "moves">, b: Omit<Edit, "moves">) =>
  a.board === b.board && a.dials.every((dial, index) => dial === b.dials[index]);

/**
 * The log with the board and dials now in force at move `moves`: unchanged when nothing changed,
 * and a change at the same move as the last entry replaces it (a dial dragged while paused).
 */
export function withEdit(
  log: Edit[],
  moves: number,
  now: Dials & { tiles: readonly Tile[] },
): Edit[] {
  const entry: Edit = { moves, board: encodeBoard(now.tiles), dials: dialsOf(now) };
  const last = log.at(-1);
  if (last && sameEdit(last, entry)) return log;
  if (last && last.moves >= moves) return [...log.slice(0, -1), { ...entry, moves: last.moves }];
  return [...log, entry];
}

/**
 * Rebuilds a run from its state: the edits replayed at the moves they happened, up to the saved
 * move (or, for an older link, the saved number of tries). Every finished try is handed to
 * `onTry` the moment it ends, with the runner as it is then.
 * No silent cap: `parseState` already bounds what a link can ask for.
 */
export function replay(
  state: Pick<ScoringState, "tiles" | "moves" | "episodes" | "attempt" | "log"> & Dials,
  onTry: (episode: Episode, runner: QRunner) => void = () => {},
): QRunner {
  const log: readonly Edit[] =
    state.log.length > 0
      ? state.log
      : [{ moves: 0, board: encodeBoard(state.tiles), dials: dialsOf(state) }];
  const [first] = log;
  const dials = (edit: Edit | undefined): Dials => ({
    curiosity: edit?.dials[0] ?? state.curiosity,
    learnRate: edit?.dials[1] ?? state.learnRate,
    lookAhead: edit?.dials[2] ?? state.lookAhead,
  });
  let tiles = decodeBoard(first?.board ?? "", state.tiles);
  const runner = createQRunner(worldOf(tiles), settingsOf(dials(first)), SEED + state.attempt);
  // One move at a time, so each try is recorded with the scores as they were when it ended.
  const advanceTo = (moves: number) => {
    while (runner.moves < moves) for (const episode of runner.advance(1)) onTry(episode, runner);
  };
  for (const edit of log.slice(1)) {
    advanceTo(edit.moves);
    tiles = decodeBoard(edit.board, tiles);
    runner.setWorld(worldOf(tiles));
    runner.configure(settingsOf(dials(edit)));
  }
  if (state.moves > 0) advanceTo(state.moves);
  else
    while (runner.episodes < state.episodes)
      for (const episode of runner.advance(1)) onTry(episode, runner);
  return runner;
}
