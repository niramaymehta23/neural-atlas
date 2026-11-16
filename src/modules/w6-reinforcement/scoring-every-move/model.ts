/**
 * The puppy's board, the dials as Q-learning settings, and what each finished episode leaves
 * on the timeline. The learning itself is the engine's seeded Q-learning runner.
 */
import { isEnd, type Tile, type World } from "@/engine/rl/gridworld";
import { bestPath, type Episode, type LearnerSettings } from "@/engine/rl/q-learning";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 7;
export const ROWS = 5;
/** Bottom left: where every try begins. */
export const START = 28;

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap", c: "coin" };
/** A kitchen board: lava along the bottom between the puppy and its bowl. */
export const KITCHEN: Tile[] = [".......", ".......", "..#.#..", ".......", "S~~~~~G"].flatMap(
  (row) => [...row].map((mark) => MARKS[mark] ?? "floor"),
);

export type ScoringState = {
  tiles: Tile[];
  /** Dials, 0–1: "How curious", "How fast it learns", "How far ahead it cares", "How fast to play". */
  curiosity: number;
  learnRate: number;
  lookAhead: number;
  speed: number;
  brush: Tile;
  playing: boolean;
  /** Finished tries so far, so a shared link can replay the run to the same moment. */
  episodes: number;
  /** A fresh start forgets every score. */
  attempt: number;
};

export type ScoringFrame = TimelineFrame & {
  reward: number;
  /** Every square's four move scores after this try. */
  q: Float64Array;
  path: number[];
  tiles: Tile[];
  /** How much the scores are still jumping about, smoothed over recent tries. */
  wobble: number;
};

export const worldOf = (tiles: Tile[]): World => ({
  columns: COLUMNS,
  rows: ROWS,
  tiles,
  start: START,
});

export const settingsOf = (state: ScoringState): LearnerSettings => ({
  curiosity: state.curiosity * 0.5,
  learnRate: 0.05 + state.learnRate * 0.95,
  lookAhead: 0.5 + state.lookAhead * 0.49,
});

/** Moves per second: from a slow walk you can follow to a blur. */
export const movesPerSecond = (speed: number) => 3 * 1000 ** speed;

const WOBBLE_MEMORY = 0.9;

/** The frame a finished try leaves, carrying the wobble on from the previous one. */
export function frameFor(
  episode: Episode,
  q: Float64Array,
  tiles: Tile[],
  previous: ScoringFrame | undefined,
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
  };
}

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
export function plannedPath(frame: ScoringFrame): number[] {
  const path = bestPath(worldOf(frame.tiles), frame.q);
  const reached = frame.tiles[path.at(-1) ?? START] === "goal";
  return reached ? path.slice(1, -1).filter((cell) => !isEnd(frame.tiles[cell])) : [];
}
