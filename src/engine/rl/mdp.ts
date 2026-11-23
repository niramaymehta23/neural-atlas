/**
 * A board world worked out exactly, with no practice: for every square, every move's possible
 * landings and their chances (a move may slide to either side), and the value of each square
 * found by sweeping "what I get now plus how much I care about where I land" over the board until
 * it stops changing (value iteration). The same squares, moves and rewards as `gridworld.ts`, with
 * the slipperiness, the cost of a move and how much the future counts as settings. Pure.
 */
import type { Random } from "../random";
import { isEnd, landing, MOVE_COUNT, REWARDS, type World } from "./gridworld";

export type BoardRules = {
  /** Chance a move slides to one side instead (each side gets half), 0–1. */
  slip: number;
  /** What every move that does not end the try earns (negative: a cost). */
  stepReward: number;
  /** How much the next square's value counts against what is earned now (gamma), 0–1. */
  care: number;
  /** What the bowl, the lava and a treat pay; the gridworld's by default. */
  rewards?: { goal: number; trap: number; coin: number };
};

export type Transition = { next: number; chance: number; reward: number; done: boolean };

/** A sweep that changes no square by more than this has settled. */
export const SETTLED = 1e-6;
/** Sweeps stop here even if a value is still creeping (care near 1 on a board with no way out). */
export const MOST_SWEEPS = 500;

/** Every way `move` from `cell` can turn out: where it lands, how likely, what it pays. */
export function transitions(
  world: World,
  cell: number,
  move: number,
  rules: BoardRules,
): Transition[] {
  const rewards = rules.rewards ?? REWARDS;
  const slip = Math.min(1, Math.max(0, rules.slip));
  const ways = [
    { move, chance: 1 - slip },
    { move: (move + 1) % MOVE_COUNT, chance: slip / 2 },
    { move: (move + MOVE_COUNT - 1) % MOVE_COUNT, chance: slip / 2 },
  ];
  const found: Transition[] = [];
  for (const way of ways) {
    if (way.chance <= 0) continue;
    const next = landing(world, cell, way.move);
    const tile = world.tiles[next];
    const reward =
      tile === "goal"
        ? rewards.goal
        : tile === "trap"
          ? rewards.trap
          : rules.stepReward + (tile === "coin" ? rewards.coin : 0);
    const same = found.find((transition) => transition.next === next);
    if (same) same.chance += way.chance;
    else found.push({ next, chance: way.chance, reward, done: isEnd(tile) });
  }
  return found;
}

/** True for squares a learner can stand on and choose a move from. */
export const isPlayable = (world: World, cell: number) => {
  const tile = world.tiles[cell];
  return tile !== undefined && tile !== "wall" && !isEnd(tile);
};

/** What `move` from `cell` is worth on average, given every square's value. */
export function moveValue(
  world: World,
  values: ArrayLike<number>,
  cell: number,
  move: number,
  rules: BoardRules,
): number {
  let total = 0;
  for (const { next, chance, reward, done } of transitions(world, cell, move, rules))
    total += chance * (reward + (done ? 0 : rules.care * (values[next] ?? 0)));
  return total;
}

/** The four moves' worth from one square (up, right, down, left). */
export const moveValues = (
  world: World,
  values: ArrayLike<number>,
  cell: number,
  rules: BoardRules,
) => Array.from({ length: MOVE_COUNT }, (_, move) => moveValue(world, values, cell, move, rules));

/** The best move from a square (the first on a tie), or −1 where there is no choosing. */
export function bestMoveFrom(
  world: World,
  values: ArrayLike<number>,
  cell: number,
  rules: BoardRules,
): number {
  if (!isPlayable(world, cell)) return -1;
  const worth = moveValues(world, values, cell, rules);
  let best = 0;
  for (let move = 1; move < MOVE_COUNT; move += 1)
    if ((worth[move] ?? 0) > (worth[best] ?? 0) + 1e-12) best = move;
  return best;
}

/** One sweep over the board: each square's value becomes its best move's worth. */
export function sweep(
  world: World,
  values: ArrayLike<number>,
  rules: BoardRules,
): Float64Array<ArrayBuffer> {
  const next = new Float64Array(world.tiles.length);
  for (let cell = 0; cell < world.tiles.length; cell += 1) {
    if (!isPlayable(world, cell)) continue;
    let best = -Infinity;
    for (let move = 0; move < MOVE_COUNT; move += 1)
      best = Math.max(best, moveValue(world, values, cell, move, rules));
    next[cell] = best;
  }
  return next;
}

/** The biggest change between two boards of values. */
export function biggestChange(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let most = 0;
  for (let cell = 0; cell < a.length; cell += 1)
    most = Math.max(most, Math.abs((a[cell] ?? 0) - (b[cell] ?? 0)));
  return most;
}

/**
 * The values sweep by sweep, all zero first, until a sweep changes nothing or `most` sweeps.
 * Each value spreads one square further per sweep, which is the glow a lesson can play back.
 */
export function* valueSweeps(
  world: World,
  rules: BoardRules,
  most = MOST_SWEEPS,
): Generator<Float64Array<ArrayBuffer>> {
  let values = new Float64Array(world.tiles.length);
  yield values;
  for (let done = 0; done < most; done += 1) {
    const next = sweep(world, values, rules);
    const change = biggestChange(values, next);
    values = next;
    yield values;
    if (change < SETTLED) return;
  }
}

export type Solution = {
  values: Float64Array;
  /** The best move from each square, −1 on walls, the bowl and the lava. */
  policy: Int8Array;
  sweeps: number;
};

/** The settled values and the best move from every square. */
export function solve(world: World, rules: BoardRules): Solution {
  let values = new Float64Array(world.tiles.length);
  let sweeps = -1;
  for (const next of valueSweeps(world, rules)) {
    values = next;
    sweeps += 1;
  }
  return { values, policy: policyOf(world, values, rules), sweeps };
}

/** The best move from every square for these values. */
export function policyOf(world: World, values: ArrayLike<number>, rules: BoardRules): Int8Array {
  return Int8Array.from(world.tiles, (_, cell) => bestMoveFrom(world, values, cell, rules));
}

/**
 * For each square, the chance that following `policy` reaches a bowl at all (rather than lava,
 * or wandering forever). Squares with no move (−1) other than the bowl count as never.
 */
export function goalChance(world: World, policy: ArrayLike<number>, rules: BoardRules) {
  let chance = new Float64Array(world.tiles.length);
  for (let round = 0; round < MOST_SWEEPS; round += 1) {
    const next = new Float64Array(world.tiles.length);
    for (let cell = 0; cell < world.tiles.length; cell += 1) {
      const move = policy[cell] ?? -1;
      if (!isPlayable(world, cell) || move < 0) continue;
      for (const way of transitions(world, cell, move, rules))
        next[cell] =
          (next[cell] ?? 0) +
          way.chance *
            (world.tiles[way.next] === "goal" ? 1 : way.done ? 0 : (chance[way.next] ?? 0));
    }
    const change = biggestChange(chance, next);
    chance = next;
    if (change < SETTLED) break;
  }
  return chance;
}

export type Walk = {
  /** Squares visited, the start first. */
  path: number[];
  /** For each move, whether it slid sideways. */
  slips: boolean[];
  end: "goal" | "trap" | "limit";
  /** Everything earned on the way. */
  reward: number;
};

/** One seeded walk following `policy` from the world's start, up to `most` moves. */
export function walk(
  world: World,
  policy: ArrayLike<number>,
  rules: BoardRules,
  random: Random,
  most = 60,
): Walk {
  const path = [world.start];
  const slips: boolean[] = [];
  let reward = 0;
  let cell = world.start;
  for (let taken = 0; taken < most; taken += 1) {
    const move = policy[cell] ?? -1;
    if (move < 0) break;
    const roll = random.next();
    const slip = Math.min(1, Math.max(0, rules.slip));
    const slid =
      roll < slip / 2
        ? (move + 1) % MOVE_COUNT
        : roll < slip
          ? (move + MOVE_COUNT - 1) % MOVE_COUNT
          : move;
    const [way] = transitions(world, cell, slid, { ...rules, slip: 0 });
    if (!way) break;
    slips.push(slid !== move);
    reward += way.reward;
    cell = way.next;
    path.push(cell);
    if (way.done)
      return { path, slips, end: world.tiles[cell] === "goal" ? "goal" : "trap", reward };
  }
  return { path, slips, end: "limit", reward };
}
