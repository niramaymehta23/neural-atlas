/**
 * Now vs later: a small bowl near the start and a big one far away, and how much the puppy cares
 * about food that is further off (discounting). The plan is worked out exactly from the two
 * dials (`engine/rl/mdp`), so a link redraws the same view.
 */
import { landing, type Tile, type World } from "@/engine/rl/gridworld";
import { moveValues, solve, type BoardRules } from "@/engine/rl/mdp";
import { tilesFrom } from "@/features/rl/boards";
import type { TimelineFrame } from "@/platform/contract";

export const COLUMNS = 7;
export const ROWS = 5;
/** Bottom left: where the puppy starts. */
export const START = 28;
/** The small bowl, two moves from the start. */
export const NEAR = 30;
/** The big bowl in the far corner, ten moves from the start. */
export const FAR = 6;
export const NEAR_MOVES = 2;
export const FAR_MOVES = 10;
export const BOARD: Tile[] = tilesFrom(["......G", ".......", ".#.#...", ".......", "S.G...."]);

/** "How far ahead it cares" at the top of its dial keeps this much per move (never all of it). */
export const MOST_CARE = 0.99;
/** "How big the far bowl", from as big as the near one to ten times as big. */
export const PRIZE = { min: 1, max: 10, start: 4 } as const;
/**
 * Up to here (above the very bottom) the telescope reads "right now". Measured: anywhere in this
 * band the plan heads for the small bowl whatever the big one's size, because ten moves away
 * even a tenfold feast counts for less than a thousandth of it.
 */
export const RIGHT_NOW = 0.35;
/** Two worths closer than this are the same: the puppy has no reason to prefer either. */
const SAME = 1e-12;

export type NowState = {
  /** Dials: "How far ahead it cares" (0–1) and "How big the far bowl" (1–10). */
  care: number;
  prize: number;
};

export type Destination = "near" | "far" | "neither";

export type NowFrame = TimelineFrame & {
  key: string;
  destination: Destination;
};

export const worldOf = (tiles: readonly Tile[] = BOARD): World => ({
  columns: COLUMNS,
  rows: ROWS,
  tiles,
  start: START,
});

export const gammaOf = (care: number) => care * MOST_CARE;

export const rulesOf = ({ care, prize }: NowState): BoardRules => ({
  slip: 0,
  stepReward: 0,
  care: gammaOf(care),
  bowls: new Map([
    [NEAR, 1],
    [FAR, prize],
  ]),
});

export const keyOf = ({ care, prize }: NowState) => `${care}|${prize}`;

/** How much each bowl counts from the start: its size, shrunk once for every move after the first. */
export function worthFromStart({ care, prize }: NowState) {
  const gamma = gammaOf(care);
  return { near: gamma ** (NEAR_MOVES - 1), far: prize * gamma ** (FAR_MOVES - 1) };
}

/** True where all four moves are worth the same: no move is any better than another. */
export function noPreference(worth: readonly number[]) {
  return Math.max(...worth) - Math.min(...worth) < SAME;
}

/** The plan, its route from the start (until a bowl, or until no move is better), and where it ends. */
export function workOut(state: NowState) {
  const world = worldOf();
  const rules = rulesOf(state);
  const plan = solve(world, rules);
  const path = [START];
  let destination: Destination = "neither";
  for (let cell = START; path.length <= world.tiles.length;) {
    if (noPreference(moveValues(world, plan.values, cell, rules))) break;
    const next = landing(world, cell, plan.policy[cell] ?? 0);
    if (next === cell || path.includes(next)) break;
    path.push(next);
    cell = next;
    if (next === NEAR || next === FAR) {
      destination = next === NEAR ? "near" : "far";
      break;
    }
  }
  return { key: keyOf(state), world, rules, plan, path, destination };
}

export type Worked = ReturnType<typeof workOut>;

export const frameOf = (worked: Worked): Omit<NowFrame, "epoch"> => ({
  loss: 0,
  key: worked.key,
  destination: worked.destination,
});
