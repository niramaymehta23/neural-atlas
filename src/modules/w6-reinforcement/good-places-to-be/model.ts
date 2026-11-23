/**
 * Good places to be: how good each square is to stand on (its value), worked out sweep by sweep
 * from all-zero (`engine/rl/mdp` `valueSweeps`). Each sweep is one moment on the timeline, so the
 * glow can be watched spreading out from the bowl one square at a time. A run is a pure function
 * of the board and the dials, so a link replays it exactly.
 */
import {
  isPlayable,
  moveValues,
  valueSweeps,
  biggestChange,
  type BoardRules,
} from "@/engine/rl/mdp";
import type { Tile, World } from "@/engine/rl/gridworld";
import { tilesFrom } from "@/features/rl/boards";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 7;
export const ROWS = 5;
/** Bottom left: the puppy's corner. */
export const START = 28;
/** A garden with the bowl in the far corner, ten moves from the puppy, a wall and a lava pool. */
export const GARDEN: Tile[] = tilesFrom(["......G", "..#....", "..#.~..", ".......", "S......"]);
/** What can be painted here; treats are left out, so the only good thing is the bowl. */
export const BRUSHES = ["floor", "wall", "trap", "goal"] as const satisfies readonly Tile[];

/** "How far ahead it cares" at the top of its dial keeps this much per move. */
export const MOST_CARE = 0.99;
/** "How slippery" at the top of its dial: half of all moves slide to one side. */
export const MOST_SLIP = 0.5;
/** A square at least this good (the bowl is worth 1) is warm: it glows and wears a + mark. */
export const WARM = 0.1;
/**
 * A run stops once no square changes by more than this in a sweep: no tint visibly changes after
 * that. Measured on the garden: 11 sweeps on a still floor, up to 42 at the most slippery and
 * far-sighted dials.
 */
export const GLOW_SETTLED = 0.002;
/** The guess asks about the puppy's corner after this many spreads. */
export const ASKED_AFTER = 3;
/** Moments played a second, so the glow can be seen moving one square at a time. */
export const SPREADS_PER_SECOND = 6;

export type GlowState = {
  tiles: Tile[];
  /** Dials, 0–1: "How far ahead it cares" and "How slippery". */
  care: number;
  slippery: number;
  brush: Tile;
  /** Glows spread so far; a link replays the last one. */
  runs: number;
};

export type GlowFrame = TimelineFrame & {
  /** The board and dials this run was worked out for. */
  key: string;
  /** Every square's value after this many sweeps (the epoch). */
  values: number[];
  /** The first sweep the puppy's corner was warm, or −1 while it is not. */
  warmFrom: number;
  /** Squares warm now. */
  warm: number;
  /** The run's final moment: the glow has settled. */
  last: boolean;
};

export const worldOf = (tiles: readonly Tile[]): World => ({
  columns: COLUMNS,
  rows: ROWS,
  tiles,
  start: START,
});

export const rulesOf = ({ care, slippery }: Pick<GlowState, "care" | "slippery">): BoardRules => ({
  slip: slippery * MOST_SLIP,
  stepReward: 0,
  care: care * MOST_CARE,
});

export const keyOf = ({ tiles, care, slippery }: Pick<GlowState, "tiles" | "care" | "slippery">) =>
  `${tiles.join(",")}|${care}|${slippery}`;

const warmSquares = (world: World, values: ArrayLike<number>) =>
  world.tiles.filter((_, cell) => isPlayable(world, cell) && (values[cell] ?? 0) >= WARM).length;

/** Every moment of one glow: all cold first, then one sweep a moment until nothing visibly changes. */
export function* glowRun(state: GlowState): Generator<GlowFrame> {
  const world = worldOf(state.tiles);
  const key = keyOf(state);
  let previous: Float64Array | null = null;
  let warmFrom = -1;
  let sweep = 0;
  let pending: GlowFrame | null = null;
  for (const values of valueSweeps(world, rulesOf(state))) {
    const change = previous ? biggestChange(previous, values) : 0;
    if (warmFrom < 0 && (values[START] ?? 0) >= WARM) warmFrom = sweep;
    if (pending) yield pending;
    const settled = previous !== null && change < GLOW_SETTLED;
    pending = {
      epoch: sweep,
      loss: change,
      key,
      values: Array.from(values),
      warmFrom,
      warm: warmSquares(world, values),
      last: settled,
    };
    if (settled) break;
    previous = values;
    sweep += 1;
  }
  if (pending) yield { ...pending, last: true };
}

/** Each square's favourite move at these values, or −1 where no move is better than another. */
export function leansAt(
  state: Pick<GlowState, "tiles" | "care" | "slippery">,
  values: ArrayLike<number>,
) {
  const world = worldOf(state.tiles);
  const rules = rulesOf(state);
  return world.tiles.map((_, cell) => {
    if (!isPlayable(world, cell)) return -1;
    const worth = moveValues(world, values, cell, rules);
    const best = Math.max(...worth);
    if (best - Math.min(...worth) < 1e-9) return -1;
    return worth.indexOf(best);
  });
}
