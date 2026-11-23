/**
 * The game board: a puppy's board of places, moves, chances and rewards, worked out exactly
 * (`engine/rl/mdp`). Nothing practises: the plan, the trap squares and the average walk follow
 * from the board and the two dials at once, so a link redraws exactly the same view.
 */
import { landing, MOVE_COUNT, isEnd, type Tile, type World } from "@/engine/rl/gridworld";
import {
  averageMoves,
  goalChance,
  safestChance,
  solve,
  walk,
  type BoardRules,
  type Walk,
} from "@/engine/rl/mdp";
import { createRandom } from "@/engine/random";
import { tilesFrom } from "@/features/rl/boards";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 7;
export const ROWS = 5;
/** Bottom left: where every walk begins. */
export const START = 28;
/** The puppy's kitchen: lava along the bottom between the puppy and its bowl, two walls above. */
export const HOME: Tile[] = tilesFrom([".......", ".......", "..#.#..", ".......", "S~~~~~G"]);

/** How much the next square counts against what a move pays now. Fixed: this lesson is the board. */
export const CARE = 0.95;
/** "How slippery" at the top of its dial: half of all moves slide to one side. */
export const MOST_SLIP = 0.5;
/** "How tiring each move" at the top of its dial: each move costs this much (the bowl pays 1). */
export const MOST_COST = 0.4;
/** Below this on either dial, the floor is still or moves are free. */
export const NONE = 0.02;
/**
 * "How slippery" from here up is "very slippery", where the guess is revealed. Measured: on the
 * kitchen the average walk home grows from 8 moves on a still floor to about 27 here and 35 at
 * the top, because the plan keeps off the lava's edge and waits by walls for a lucky slide.
 * Lava painted above square 24 (in the middle, just above the bottom lava) makes 24 a trap from
 * 0.7 up: its safest chance home is 0.49 there, 0.46 here and 0.42 at 0.8.
 */
export const VERY_SLIPPERY = 0.75;
/** A square is a trap when even the safest way home from it gets there less often than this. */
export const TRAP_BELOW = 0.5;
/** A trip counts as longer once it is longer than on a still floor by more than this many moves. */
export const LONGER_BY = 1;
/** Every walk with the same number is the same walk. */
export const WALK_SEED = 101;
/** A walk stops here if it has not ended. */
export const WALK_MOVES = 60;

export type BoardState = {
  tiles: Tile[];
  /** Dials, 0–1: "How slippery" and "How tiring each move". */
  slippery: number;
  tiring: number;
  brush: Tile;
  /** Walks tried so far; the newest one is shown. */
  walks: number;
};

/** What the board shows now, recorded whenever it changes, for the mission and the guess. */
export type BoardFrame = TimelineFrame & {
  /** The board and dials this was worked out for. */
  key: string;
  /** Squares the puppy can reach where even the safest way home fails more often than not. */
  traps: number[];
  /** The plan's average walk from the start, in moves (Infinity: it may never finish). */
  trip: number;
  /** The same board's average walk on a still floor. */
  stillTrip: number;
  /** The chance the plan from the start reaches the bowl at all. */
  home: number;
};

export const worldOf = (tiles: readonly Tile[]): World => ({
  columns: COLUMNS,
  rows: ROWS,
  tiles,
  start: START,
});

export const rulesOf = ({ slippery, tiring }: Pick<BoardState, "slippery" | "tiring">) =>
  ({
    slip: slippery * MOST_SLIP,
    stepReward: -tiring * MOST_COST,
    care: CARE,
  }) satisfies BoardRules;

export const keyOf = ({
  tiles,
  slippery,
  tiring,
}: Pick<BoardState, "tiles" | "slippery" | "tiring">) => `${tiles.join(",")}|${slippery}|${tiring}`;

/** Squares the puppy can stand on at some point: reached from the start without ending the walk. */
export function reachable(world: World): Set<number> {
  const seen = new Set([world.start]);
  const waiting = [world.start];
  while (waiting.length > 0) {
    const cell = waiting.pop() ?? world.start;
    for (let move = 0; move < MOVE_COUNT; move += 1) {
      const next = landing(world, cell, move);
      if (seen.has(next) || isEnd(world.tiles[next])) continue;
      seen.add(next);
      waiting.push(next);
    }
  }
  return seen;
}

/** Everything the board shows: the plan, the traps and how long walks last. */
export function workOut(state: Pick<BoardState, "tiles" | "slippery" | "tiring">) {
  const world = worldOf(state.tiles);
  const rules = rulesOf(state);
  const plan = solve(world, rules);
  const safest = safestChance(world, rules.slip);
  const reached = reachable(world);
  const traps = [...reached]
    .filter((cell) => {
      const chance = safest[cell] ?? 0;
      return chance > 0 && chance < TRAP_BELOW;
    })
    .sort((a, b) => a - b);
  const still = { ...rules, slip: 0 };
  return {
    key: keyOf(state),
    world,
    rules,
    plan,
    traps,
    trip: averageMoves(world, plan.policy, rules)[START] ?? Infinity,
    stillTrip: averageMoves(world, solve(world, still).policy, still)[START] ?? Infinity,
    home: goalChance(world, plan.policy, rules)[START] ?? 0,
  };
}

export type Worked = ReturnType<typeof workOut>;

export const frameOf = (worked: Worked): Omit<BoardFrame, "epoch"> => ({
  loss: 0,
  key: worked.key,
  traps: worked.traps,
  trip: worked.trip,
  stillTrip: worked.stillTrip,
  home: worked.home,
});

/**
 * How likely each move from a square really happens under the plan: the chosen move most, each
 * side move half the slip. The arrow field draws these as wedge lengths.
 */
export function moveShares(best: number, slip: number): number[] {
  if (best < 0) return [0, 0, 0, 0];
  return Array.from({ length: MOVE_COUNT }, (_, move) =>
    move === best
      ? 1 - slip
      : move === (best + 1) % MOVE_COUNT || move === (best + MOVE_COUNT - 1) % MOVE_COUNT
        ? slip / 2
        : 0,
  );
}

/** The newest walk tried, or null before the first. */
export function walkOf(walks: number, worked: Worked): Walk | null {
  if (walks <= 0) return null;
  return walk(
    worked.world,
    worked.plan.policy,
    worked.rules,
    createRandom(WALK_SEED + walks),
    WALK_MOVES,
  );
}

/** "longer" or "same": how the trip home now compares with a still floor; null while unclear. */
export function tripChange(
  frame: Pick<BoardFrame, "trip" | "stillTrip">,
): "longer" | "same" | null {
  if (!Number.isFinite(frame.stillTrip)) return null;
  return frame.trip > frame.stillTrip + LONGER_BY ? "longer" : "same";
}
