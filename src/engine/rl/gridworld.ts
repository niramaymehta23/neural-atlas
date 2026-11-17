/**
 * A small board world: squares you can stand on, walls, a goal, traps and coins. The floor is a
 * little slippery, so a move sometimes slides sideways: that chance is what makes learning too
 * fast unsettling. Coins never run out: one pays every time it is stepped on, which is the
 * loophole a learner can exploit by pacing back and forth. Pure and seeded through the Random it
 * is handed.
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

export type Outcome = {
  next: number;
  reward: number;
  done: boolean;
  /** The move slid sideways instead of going where it was meant to. */
  slipped: boolean;
};

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
  const slipped = slid !== move;
  if (tile === "goal") return { next, reward: REWARDS.goal, done: true, slipped };
  if (tile === "trap") return { next, reward: REWARDS.trap, done: true, slipped };
  const reward = REWARDS.step + (tile === "coin" ? REWARDS.coin : 0);
  return { next, reward, done: false, slipped };
}

/** True for squares an episode ends on. */
export function isEnd(tile: Tile | undefined): boolean {
  return tile === "goal" || tile === "trap";
}

/** Whether the world has a goal, and whether any way from the start reaches one. */
export function reachability(world: World): "reachable" | "blocked" | "no-goal" {
  if (!world.tiles.includes("goal")) return "no-goal";
  const seen = new Set([world.start]);
  const waiting = [world.start];
  while (waiting.length > 0) {
    const cell = waiting.pop() ?? world.start;
    if (world.tiles[cell] === "goal") return "reachable";
    // A trap ends the try, so no way runs through one.
    if (world.tiles[cell] === "trap") continue;
    for (let move = 0; move < MOVE_COUNT; move += 1) {
      const next = landing(world, cell, move);
      if (!seen.has(next)) {
        seen.add(next);
        waiting.push(next);
      }
    }
  }
  return "blocked";
}

/** True when some way from the start reaches a goal. */
export const reachable = (world: World) => reachability(world) === "reachable";
