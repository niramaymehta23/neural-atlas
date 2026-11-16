/**
 * A small board world: squares you can stand on, walls, a goal, traps and coins. The floor is a
 * little slippery, so a move sometimes slides sideways: that chance is what makes learning too
 * fast unsettling. Pure and seeded through the Random it is handed.
 */
import type { Random } from "../random";

export const TILES = ["floor", "wall", "goal", "trap", "coin"] as const;
export type Tile = (typeof TILES)[number];

export type World = {
  columns: number;
  rows: number;
  /** Row by row from the top, `columns` per row. */
  tiles: readonly Tile[];
  /** Where every episode begins. */
  start: number;
};

/** Up, right, down, left. */
export const MOVES = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
] as const;
export const MOVE_COUNT = MOVES.length;

export const REWARDS = { step: -0.04, goal: 1, trap: -1, coin: 0.2 } as const;
/** Chance a move slides to one side instead (each side gets half). */
export const SLIP = 0.1;

export type Outcome = { next: number; reward: number; done: boolean };

/** Where `move` from `cell` lands: walls and edges leave you where you are. */
export function landing(world: World, cell: number, move: number): number {
  const [dRow, dColumn] = MOVES[move] ?? MOVES[0];
  const row = Math.floor(cell / world.columns) + dRow;
  const column = (cell % world.columns) + dColumn;
  if (row < 0 || row >= world.rows || column < 0 || column >= world.columns) return cell;
  const next = row * world.columns + column;
  return world.tiles[next] === "wall" ? cell : next;
}

/** One move, which may slip sideways. */
export function step(world: World, cell: number, move: number, random: Random): Outcome {
  const roll = random.next();
  const slid =
    roll < SLIP / 2
      ? (move + 1) % MOVE_COUNT
      : roll < SLIP
        ? (move + MOVE_COUNT - 1) % MOVE_COUNT
        : move;
  const next = landing(world, cell, slid);
  const tile = world.tiles[next];
  if (tile === "goal") return { next, reward: REWARDS.goal, done: true };
  if (tile === "trap") return { next, reward: REWARDS.trap, done: true };
  return { next, reward: REWARDS.step + (tile === "coin" ? REWARDS.coin : 0), done: false };
}

/** True for squares an episode ends on. */
export function isEnd(tile: Tile | undefined): boolean {
  return tile === "goal" || tile === "trap";
}
