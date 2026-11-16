/**
 * Q-learning on a board world, one move at a time: a score for every move from every square,
 * nudged after each move towards "what I got plus the best score from where I landed".
 * Seeded; how the moves are chunked into calls never changes the run.
 */
import { createRandom } from "../random";
import { isEnd, landing, MOVE_COUNT, step, type World } from "./gridworld";

export type LearnerSettings = {
  /** Chance of trying a random move instead of the best known one (epsilon). */
  curiosity: number;
  /** How far each score moves towards the new evidence (alpha). */
  learnRate: number;
  /** How much the future counts against now (gamma). */
  lookAhead: number;
};

export type Episode = {
  /** Finished episodes so far, this one included. */
  index: number;
  reward: number;
  /** Squares visited, start first. */
  path: number[];
  /** How far a score jumped per move, on average: stays big while learning cannot settle. */
  jump: number;
};

/** An episode that wanders this long ends anyway. */
export const MAX_STEPS = 60;

/** The best move from a square (first one on ties). */
export function bestMove(q: ArrayLike<number>, cell: number): number {
  let best = 0;
  for (let move = 1; move < MOVE_COUNT; move += 1)
    if ((q[cell * MOVE_COUNT + move] ?? 0) > (q[cell * MOVE_COUNT + best] ?? 0)) best = move;
  return best;
}

/** How good a square looks: its best move's score. */
export function squareValue(q: ArrayLike<number>, cell: number): number {
  return q[cell * MOVE_COUNT + bestMove(q, cell)] ?? 0;
}

/** Following the best moves without slipping: the squares visited, until an end, a loop or the limit. */
export function bestPath(world: World, q: ArrayLike<number>, from = world.start): number[] {
  const path = [from];
  let cell = from;
  while (!isEnd(world.tiles[cell]) && path.length <= MAX_STEPS) {
    const next = landing(world, cell, bestMove(q, cell));
    if (path.includes(next)) break;
    path.push(next);
    cell = next;
  }
  return path;
}

export function reachesGoal(world: World, q: ArrayLike<number>): boolean {
  return world.tiles[bestPath(world, q).at(-1) ?? world.start] === "goal";
}

export type QRunner = {
  /** Takes `moves` moves; returns the episodes that finished meanwhile. */
  advance(moves: number): Episode[];
  readonly q: Float64Array;
  /** Where the learner stands now. */
  readonly position: number;
  readonly episodes: number;
  /** A repainted board: the scores are kept, a learner standing on a new wall starts over. */
  setWorld(world: World): void;
  configure(settings: LearnerSettings): void;
};

export function createQRunner(world: World, settings: LearnerSettings, seed: number): QRunner {
  const random = createRandom(seed);
  const q = new Float64Array(world.tiles.length * MOVE_COUNT);
  let current = world;
  let options = settings;
  let position = world.start;
  let path = [position];
  let reward = 0;
  let jumps = 0;
  let episodes = 0;

  function choose(cell: number): number {
    if (random.next() < options.curiosity) return random.int(MOVE_COUNT);
    // Ties go to a random one of them, so an untrained learner wanders instead of pacing.
    const top = squareValue(q, cell);
    const tied = Array.from({ length: MOVE_COUNT }, (_, move) => move).filter(
      (move) => q[cell * MOVE_COUNT + move] === top,
    );
    return tied[random.int(tied.length)] ?? 0;
  }

  function finish(): Episode {
    episodes += 1;
    const episode = { index: episodes, reward, path, jump: jumps / (path.length - 1) };
    jumps = 0;
    position = current.start;
    path = [position];
    reward = 0;
    return episode;
  }

  return {
    advance(moves) {
      const finished: Episode[] = [];
      for (let taken = 0; taken < moves; taken += 1) {
        const move = choose(position);
        const outcome = step(current, position, move, random);
        const target = outcome.done
          ? outcome.reward
          : outcome.reward + options.lookAhead * squareValue(q, outcome.next);
        const at = position * MOVE_COUNT + move;
        const change = options.learnRate * (target - (q[at] ?? 0));
        q[at] = (q[at] ?? 0) + change;
        jumps += Math.abs(change);
        reward += outcome.reward;
        position = outcome.next;
        path.push(position);
        if (outcome.done || path.length > MAX_STEPS) finished.push(finish());
      }
      return finished;
    },
    q,
    get position() {
      return position;
    },
    get episodes() {
      return episodes;
    },
    setWorld(world) {
      current = world;
      if (world.tiles[position] === "wall" || isEnd(world.tiles[position])) {
        position = world.start;
        path = [position];
      }
    },
    configure(next) {
      options = next;
    },
  };
}
