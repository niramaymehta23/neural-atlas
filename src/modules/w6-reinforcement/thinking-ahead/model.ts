/**
 * Thinking ahead: you play Connect Four against a player that imagines games before it moves
 * (`engine/rl/mcts.ts`). The game is kept as its list of moves, yours and its, so a link replays
 * it exactly; its thinking is worked out again from the moves and the dials with a seed taken
 * from the moves, so the same position and dials always imagine the same games.
 */
import { CELLS, COLUMNS, fromMoves, ROWS, type Board } from "@/engine/rl/connect-four";
import type { SearchSettings } from "@/engine/rl/mcts";
import type { TimelineFrame } from "@/platform/contract";

export type AheadState = {
  /** Every disc dropped so far, yours first (you are player 1, it is player 2). */
  moves: number[];
  /** "How many futures it imagines": a step of `FUTURES`. */
  futures: number;
  /** "How long each imagined game runs": a step of `LENGTHS`. */
  length: number;
};

/** Imagined games per move at each step of its dial; the bottom only looks one move ahead. */
export const FUTURES = [0, 30, 100, 300, 1000, 3000, 10_000] as const;
/** Random moves that finish each imagined game, at most, at each step of its dial. */
export const LENGTHS = [1, 2, 4, 8, 16, CELLS] as const;
export const DEFAULT_FUTURES = 5;
export const DEFAULT_LENGTH = LENGTHS.length - 1;
export const ONE_MOVE_AHEAD = 0;

export const YOU = 1;
export const IT = 2;
const SEED = 6;

/**
 * The ready-made puzzle: nine discs in, its turn. Your discs climb a slant from the bottom of the
 * middle column to the right; one more in the far-right column makes four.
 */
export const PUZZLE = [3, 4, 4, 6, 5, 5, 6, 6, 5] as const;
/** The column that completes your slant: the threat it must block. */
export const THREAT = 6;

/**
 * Measured (the puzzle's own seed): it blocks the far-right column at every dial step from 100
 * imagined games up, whatever the game length (with 30 it picks columns 1, 3, 4 or 6 by length);
 * looking one move ahead it drops in the middle instead. Pinned in `thinking.test.tsx`.
 */
export const BLOCKS_FROM = 2;
/**
 * At least this share of its imagined games through one column counts as "mostly into one
 * column". Measured on the puzzle: at 3000 imagined games the blocking column gets 69–76 in 100
 * whatever the game length (10 000 games: 87–89; 1000 games: 45–57); looking one move ahead
 * every column gets one look in seven.
 */
export const FOCUSED = 0.5;

export const settingsOf = (state: Pick<AheadState, "futures" | "length">): SearchSettings => ({
  games: FUTURES[state.futures] ?? FUTURES[DEFAULT_FUTURES],
  length: LENGTHS[state.length] ?? CELLS,
});

/** The seed of a position's thinking: FNV-1a over its moves, so a link imagines the same games. */
export function positionSeed(moves: readonly number[]): number {
  let hash = 0x811c9dc5 ^ SEED;
  for (const move of moves) {
    hash ^= move + 1;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * The position its thinking is about: now, when it is its turn; otherwise the position before
 * its last move (how it chose it). Null before it has had a turn.
 */
export function thinkingAt(moves: readonly number[]): number[] | null {
  const board = fromMoves(moves);
  if (board.outcome === 0 && board.turn === IT) return [...moves];
  // Its moves are the second, fourth, sixth… in the list.
  const last = moves.length % 2 === 0 ? moves.length - 1 : moves.length - 2;
  return last >= 1 ? moves.slice(0, last) : null;
}

export const isItsTurn = (board: Board) => board.outcome === 0 && board.turn === IT;
export const isYourTurn = (board: Board) => board.outcome === 0 && board.turn === YOU;

export const startsWithPuzzle = (moves: readonly number[]) =>
  moves.length >= PUZZLE.length && PUZZLE.every((move, at) => moves[at] === move);

export const isPuzzle = (moves: readonly number[] | null) =>
  !!moves && moves.length === PUZZLE.length && startsWithPuzzle(moves);

/**
 * The mission: from the puzzle it did not block, and your very next disc won. The moves say it
 * all, so a link to that game shows it too.
 */
export function missedThePuzzle(moves: readonly number[]): boolean {
  if (moves.length !== PUZZLE.length + 2 || !startsWithPuzzle(moves)) return false;
  return moves[PUZZLE.length] !== THREAT && fromMoves(moves).outcome === YOU;
}

/** A finished (or just started) piece of thinking, recorded so the guess can judge it. */
export type AheadFrame = TimelineFrame & {
  /** The position and dials the thinking was for. */
  key: string;
  finished: boolean;
  /** The thinking was about the puzzle position. */
  puzzle: boolean;
  futures: number;
  /** Share of its imagined games that went through its most imagined column (0–1). */
  topShare: number;
  /** The column it picks (−1 while thinking). */
  pick: number;
};

export const keyOf = (
  moves: readonly number[] | null,
  state: Pick<AheadState, "futures" | "length">,
) => `${moves ? moves.join("") : "-"}|${state.futures}|${state.length}`;

/** How far across a column is, as one of five plain places (left edge to right edge). */
export function placeOf(column: number): "farLeft" | "left" | "middle" | "right" | "farRight" {
  if (column <= 0) return "farLeft";
  if (column <= 2) return "left";
  if (column === 3) return "middle";
  if (column < COLUMNS - 1) return "right";
  return "farRight";
}

/** Holes left in a column. */
export const roomIn = (board: Board, column: number) => ROWS - (board.heights[column] ?? ROWS);
