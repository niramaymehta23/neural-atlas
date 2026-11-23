/**
 * Habits nudged by how tries went (REINFORCE with a baseline). Every square keeps four
 * preferences, one per move; its chances of each move are their softmax. A try walks from the
 * start by drawing moves from those chances on the slippery gridworld. After every batch of tries,
 * each move taken is nudged up when the rest of that try went better than tries from that square
 * usually go (the baseline), and down when it went worse; the nudge's size is the step. Seeded:
 * the same world, settings and seed give the same tries, nudges and chances every time. Pure.
 */
import { multiplied } from "../multiplications";
import { createRandom, type Random } from "../random";
import { MOVE_COUNT, step, type World } from "./gridworld";

export type HabitSettings = {
  /** How far each nudge moves the preferences (the step size), above 0. */
  nudge: number;
  /** Tries played between nudges, a whole number from 1. */
  batch: number;
  /** How much a reward one move later counts (gamma), 0–1. */
  care?: number;
  /** A try that has not ended after this many moves stops there. */
  most?: number;
};

/** How much a reward one move later counts, unless the settings say otherwise. */
export const CARE = 0.95;
/** Moves before a try gives up. */
export const MOST_MOVES = 40;
/** How quickly each square's "usual" return follows what tries from it get (0–1). */
export const BASELINE_RATE = 0.1;

export type HabitTry = {
  /** Squares visited, the start first. */
  path: number[];
  /** The move chosen at each step (before any slip). */
  moves: number[];
  /** What each move earned. */
  rewards: number[];
  end: "goal" | "trap" | "limit";
  /** Everything earned on the way. */
  reward: number;
};

/** The chances of each move (up, right, down, left) from one square: the softmax of its preferences. */
export function chancesAt(preferences: ArrayLike<number>, cell: number): number[] {
  const base = cell * MOVE_COUNT;
  let most = -Infinity;
  for (let move = 0; move < MOVE_COUNT; move += 1)
    most = Math.max(most, preferences[base + move] ?? 0);
  const weights = Array.from({ length: MOVE_COUNT }, (_, move) =>
    Math.exp((preferences[base + move] ?? 0) - most),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

/** Every square's four chances, one after another (cells × 4). */
export function allChances(preferences: ArrayLike<number>, cells: number): Float64Array {
  const all = new Float64Array(cells * MOVE_COUNT);
  for (let cell = 0; cell < cells; cell += 1)
    chancesAt(preferences, cell).forEach((chance, move) => {
      all[cell * MOVE_COUNT + move] = chance;
    });
  return all;
}

/** A move drawn from a square's chances. */
export function drawMove(chances: readonly number[], random: Random): number {
  let roll = random.next();
  for (let move = 0; move < MOVE_COUNT - 1; move += 1) {
    roll -= chances[move] ?? 0;
    if (roll < 0) return move;
  }
  return MOVE_COUNT - 1;
}

/** One try from the world's start, drawing every move from `chancesOf(cell)`. */
export function playTry(
  world: World,
  chancesOf: (cell: number) => readonly number[],
  random: Random,
  most = MOST_MOVES,
): HabitTry {
  const path = [world.start];
  const moves: number[] = [];
  const rewards: number[] = [];
  let cell = world.start;
  let reward = 0;
  for (let taken = 0; taken < most; taken += 1) {
    const move = drawMove(chancesOf(cell), random);
    const outcome = step(world, cell, move, random);
    moves.push(move);
    rewards.push(outcome.reward);
    reward += outcome.reward;
    cell = outcome.next;
    path.push(cell);
    if (outcome.done)
      return { path, moves, rewards, end: world.tiles[cell] === "goal" ? "goal" : "trap", reward };
  }
  return { path, moves, rewards, end: "limit", reward };
}

/** Even chances everywhere: a walker that picks every move at random. */
const EVEN = Array.from({ length: MOVE_COUNT }, () => 1 / MOVE_COUNT);

/** How often a walker choosing every move at random reaches the bowl, over `tries` seeded tries. */
export function randomWalkerSuccess(world: World, tries: number, seed: number, most = MOST_MOVES) {
  const random = createRandom(seed);
  let reached = 0;
  for (let at = 0; at < tries; at += 1)
    if (playTry(world, () => EVEN, random, most).end === "goal") reached += 1;
  return tries > 0 ? reached / tries : 0;
}

export type HabitLearner = {
  readonly world: World;
  /** Four preferences per square (cells × 4); their softmax per square is its chances. */
  readonly preferences: Float64Array;
  /** Tries played so far. */
  readonly tries: number;
  /** Nudges made so far (one per full batch). */
  readonly nudges: number;
  /** Plays one try; when it completes a batch, the habits are nudged before this returns. */
  play(): HabitTry;
};

/**
 * Discounted returns from every step of a try to its end: what the rest of the try was worth
 * from each square it stood on.
 */
export function returnsOf(rewards: readonly number[], care: number): number[] {
  const returns = new Array<number>(rewards.length);
  let ahead = 0;
  multiplied(rewards.length);
  for (let at = rewards.length - 1; at >= 0; at -= 1) {
    ahead = (rewards[at] ?? 0) + care * ahead;
    returns[at] = ahead;
  }
  return returns;
}

/** A learner that starts with even chances everywhere and nudges its habits after every batch. */
export function createHabitLearner(
  world: World,
  settings: HabitSettings,
  seed: number,
): HabitLearner {
  const cells = world.tiles.length;
  const preferences = new Float64Array(cells * MOVE_COUNT);
  const usual = new Float64Array(cells);
  const seen = new Uint8Array(cells);
  const random = createRandom(seed);
  const care = settings.care ?? CARE;
  const most = settings.most ?? MOST_MOVES;
  const batch = Math.max(1, Math.round(settings.batch));
  const nudge = Math.max(0, settings.nudge);
  let pending: HabitTry[] = [];
  let tries = 0;
  let nudges = 0;

  const nudgeHabits = () => {
    // What the rest of each try was worth from every square it stood on.
    const steps = pending.flatMap((tried) => {
      const returns = returnsOf(tried.rewards, care);
      return tried.moves.map((move, at) => ({
        cell: tried.path[at] ?? world.start,
        move,
        got: returns[at] ?? 0,
      }));
    });
    // This batch's average from each square: the usual for a square never stood on before.
    const batchMean = new Map<number, { total: number; count: number }>();
    for (const { cell, got } of steps) {
      const sum = batchMean.get(cell) ?? { total: 0, count: 0 };
      sum.total += got;
      sum.count += 1;
      batchMean.set(cell, sum);
    }
    const meanAt = (cell: number) => {
      const sum = batchMean.get(cell);
      return sum ? sum.total / sum.count : 0;
    };
    const change = new Float64Array(preferences.length);
    for (const { cell, move, got } of steps) {
      // Better than usual from here: more of this move; worse: less of it.
      const advantage = got - (seen[cell] ? (usual[cell] ?? 0) : meanAt(cell));
      const chances = chancesAt(preferences, cell);
      multiplied(MOVE_COUNT);
      for (let other = 0; other < MOVE_COUNT; other += 1) {
        const index = cell * MOVE_COUNT + other;
        change[index] =
          (change[index] ?? 0) + advantage * ((other === move ? 1 : 0) - (chances[other] ?? 0));
      }
    }
    multiplied(preferences.length);
    for (let index = 0; index < preferences.length; index += 1)
      preferences[index] = (preferences[index] ?? 0) + (nudge * (change[index] ?? 0)) / batch;
    // The usual return from each square follows what this batch got there.
    for (const cell of batchMean.keys()) {
      const mean = meanAt(cell);
      usual[cell] = seen[cell]
        ? (usual[cell] ?? 0) + BASELINE_RATE * (mean - (usual[cell] ?? 0))
        : mean;
      seen[cell] = 1;
    }
    pending = [];
    nudges += 1;
  };

  return {
    world,
    preferences,
    get tries() {
      return tries;
    },
    get nudges() {
      return nudges;
    },
    play() {
      const tried = playTry(world, (cell) => chancesAt(preferences, cell), random, most);
      tries += 1;
      pending.push(tried);
      if (pending.length >= batch) nudgeHabits();
      return tried;
    },
  };
}
