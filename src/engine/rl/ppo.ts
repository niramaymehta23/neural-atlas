/**
 * Player and coach (actor-critic with PPO's clipped change) on a small board. The player is a
 * tiny network giving the chance of each move from each square; the coach is another, guessing
 * how well things will go from each square. Each batch the player plays `BATCH_TRIES` tries; the
 * coach's guesses turn each move's result into "better or worse than expected" (the advantage);
 * then both study the batch `rounds` times. The clip keeps each move's new chance within
 * 1 ± `clip` of its chance when the batch was played, so many study rounds cannot push the player
 * far from what it just tried. Seeded and pure.
 */
import { createRandom, type Random } from "../random";
import { MOVE_COUNT, REWARDS, SLIP, step, type Tile, type World } from "./gridworld";
import { isPlayable, transitions, type BoardRules } from "./mdp";
import {
  backward,
  createAdam,
  createNet,
  forward,
  paramCount,
  softmax,
  type TinyNet,
} from "./tiny-net";

export type PpoSettings = {
  world: World;
  /** How far one batch may move a move's chance, as a share (Infinity: no rail at all). */
  clip: number;
  /** How many times each batch is studied. */
  rounds: number;
  seed: number;
};

export const PPO_HIDDEN = 16;
/** Tries the player plays per batch. */
export const BATCH_TRIES = 12;
/** A try ends here if it has reached neither the bowl nor the lava. */
export const MOST_MOVES = 25;
/** How much later rewards count for the coach's guesses. */
export const PPO_CARE = 0.95;
export const PLAYER_RATE = 0.01;
export const COACH_RATE = 0.02;

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap" };
const ROWS = ["...G", ".#~.", "S..."];

/**
 * A little board, shrunk so a player learns it in a few dozen batches: the puppy starts bottom
 * left, the bowl is top right, and a lava square sits beside the short way up.
 */
export const LITTLE_BOARD: World = {
  columns: 4,
  rows: ROWS.length,
  tiles: ROWS.flatMap((row) => [...row].map((mark) => MARKS[mark] ?? "floor")),
  start: 8,
};

/** The board's own rules: the gridworld's slip and rewards, every reward counted in full. */
export const BOARD_RULES: BoardRules = { slip: SLIP, stepReward: REWARDS.step, care: 1 };

export type PpoMoment = {
  /** Batches studied so far. */
  step: number;
  /** What the player earns per try on average now, worked out exactly. */
  score: number;
  /** The best `score` so far in this run. */
  best: number;
  /** Each square's four move chances (up, right, down, left), square by square. */
  chances: number[];
  /** The coach's guess for each square. */
  values: number[];
  /** One try from the last batch, square by square. */
  walk: number[];
  /** How far study moved the player on average (mean |new chance ÷ old chance − 1|). */
  change: number;
  loss: number;
};

const inputsFor = (world: World, cell: number) => {
  const input = new Float64Array(world.tiles.length);
  input[cell] = 1;
  return input;
};

/** Every square's move chances from the player. */
export function playerChances(world: World, player: TinyNet): Float64Array[] {
  return world.tiles.map((_, cell) => softmax(forward(player, inputsFor(world, cell)).output));
}

/**
 * What a player with these move chances earns per try from the start, on average, worked out
 * exactly over every slip, within `MOST_MOVES` moves.
 */
export function expectedScore(world: World, chances: readonly ArrayLike<number>[]): number {
  let ahead = new Float64Array(world.tiles.length);
  for (let left = 0; left < MOST_MOVES; left += 1) {
    const now = new Float64Array(world.tiles.length);
    for (let cell = 0; cell < world.tiles.length; cell += 1) {
      if (!isPlayable(world, cell)) continue;
      let total = 0;
      for (let move = 0; move < MOVE_COUNT; move += 1) {
        const chance = chances[cell]?.[move] ?? 0;
        if (chance === 0) continue;
        for (const way of transitions(world, cell, move, BOARD_RULES))
          total += chance * way.chance * (way.reward + (way.done ? 0 : (ahead[way.next] ?? 0)));
      }
      now[cell] = total;
    }
    ahead = now;
  }
  return ahead[world.start] ?? 0;
}

/** What a player that picks every move at random earns per try. */
export const randomScore = (world: World) =>
  expectedScore(
    world,
    world.tiles.map(() => new Float64Array(MOVE_COUNT).fill(1 / MOVE_COUNT)),
  );

type Taken = { cell: number; move: number; chance: number; reward: number };

function pick(chances: ArrayLike<number>, random: Random): number {
  const roll = random.next();
  let sum = 0;
  for (let move = 0; move < MOVE_COUNT; move += 1) {
    sum += chances[move] ?? 0;
    if (roll < sum) return move;
  }
  return MOVE_COUNT - 1;
}

export function createPpoRun(settings: PpoSettings) {
  const { world } = settings;
  if (!isPlayable(world, world.start))
    throw new Error("The player needs a floor square to start on.");
  const random = createRandom(settings.seed);
  const squares = world.tiles.length;
  const player = createNet(
    { inputs: squares, hidden: PPO_HIDDEN, outputs: MOVE_COUNT },
    settings.seed + 1,
  );
  const coach = createNet({ inputs: squares, hidden: PPO_HIDDEN, outputs: 1 }, settings.seed + 2);
  const playerAdam = createAdam(player.params.length);
  const coachAdam = createAdam(coach.params.length);
  const playerGrads = new Float64Array(paramCount(player.shape));
  const coachGrads = new Float64Array(paramCount(coach.shape));
  const rounds = Math.max(1, Math.round(settings.rounds));
  const clip = settings.clip;
  let batches = 0;
  let chancesNow = playerChances(world, player);
  let score = expectedScore(world, chancesNow);
  let best = score;
  let lastWalk: number[] = [world.start];
  let lastChange = 0;
  let lastLoss = 0;

  const playTry = (): { taken: Taken[]; walk: number[] } => {
    const taken: Taken[] = [];
    const path = [world.start];
    let cell = world.start;
    for (let moves = 0; moves < MOST_MOVES; moves += 1) {
      const chances = softmax(forward(player, inputsFor(world, cell)).output);
      const move = pick(chances, random);
      const outcome = step(world, cell, move, random);
      taken.push({ cell, move, chance: chances[move] ?? 0, reward: outcome.reward });
      cell = outcome.next;
      path.push(cell);
      if (outcome.done) break;
    }
    return { taken, walk: path };
  };

  const studyBatch = (samples: (Taken & { aim: number; advantage: number })[]) => {
    let change = 0;
    let loss = 0;
    const count = samples.length;
    for (let round = 0; round < rounds; round += 1) {
      playerGrads.fill(0);
      coachGrads.fill(0);
      change = 0;
      loss = 0;
      for (const sample of samples) {
        const input = inputsFor(world, sample.cell);
        const playerPass = forward(player, input);
        const chances = softmax(playerPass.output);
        const ratio = (chances[sample.move] ?? 0) / sample.chance;
        change += Math.abs(ratio - 1);
        const clipped =
          (sample.advantage > 0 && ratio > 1 + clip) || (sample.advantage < 0 && ratio < 1 - clip);
        if (!clipped) {
          const grad = new Float64Array(MOVE_COUNT);
          for (let move = 0; move < MOVE_COUNT; move += 1)
            grad[move] =
              (-sample.advantage *
                ratio *
                ((move === sample.move ? 1 : 0) - (chances[move] ?? 0))) /
              count;
          backward(player, playerPass, grad, playerGrads);
        }
        const coachPass = forward(coach, input);
        const miss = (coachPass.output[0] ?? 0) - sample.aim;
        loss += miss * miss;
        backward(coach, coachPass, [miss / count], coachGrads);
      }
      playerAdam.step(player.params, playerGrads, PLAYER_RATE);
      coachAdam.step(coach.params, coachGrads, COACH_RATE);
    }
    lastChange = count > 0 ? change / count : 0;
    lastLoss = count > 0 ? loss / count : 0;
  };

  return {
    player,
    coach,
    get step() {
      return batches;
    },
    /** Plays one batch of tries, then studies it. */
    advance() {
      const samples: (Taken & { aim: number; advantage: number })[] = [];
      for (let tries = 0; tries < BATCH_TRIES; tries += 1) {
        const { taken, walk } = playTry();
        lastWalk = walk;
        let later = 0;
        const aims = new Float64Array(taken.length);
        for (let at = taken.length - 1; at >= 0; at -= 1) {
          later = (taken[at]?.reward ?? 0) + PPO_CARE * later;
          aims[at] = later;
        }
        taken.forEach((move, at) => {
          const guess = forward(coach, inputsFor(world, move.cell)).output[0] ?? 0;
          samples.push({ ...move, aim: aims[at] ?? 0, advantage: (aims[at] ?? 0) - guess });
        });
      }
      // Advantages are compared within the batch: above or below its own average, in its spread.
      const mean = samples.reduce((sum, sample) => sum + sample.advantage, 0) / samples.length;
      const spread = Math.sqrt(
        samples.reduce(
          (sum, sample) => sum + (sample.advantage - mean) * (sample.advantage - mean),
          0,
        ) / samples.length,
      );
      for (const sample of samples) sample.advantage = (sample.advantage - mean) / (spread + 1e-8);
      studyBatch(samples);
      batches += 1;
      chancesNow = playerChances(world, player);
      score = expectedScore(world, chancesNow);
      best = Math.max(best, score);
    },
    moment(): PpoMoment {
      return {
        step: batches,
        score,
        best,
        chances: chancesNow.flatMap((square, cell) =>
          isPlayable(world, cell) ? Array.from(square) : [0, 0, 0, 0],
        ),
        values: world.tiles.map((_, cell) =>
          isPlayable(world, cell) ? (forward(coach, inputsFor(world, cell)).output[0] ?? 0) : 0,
        ),
        walk: lastWalk,
        change: lastChange,
        loss: lastLoss,
      };
    },
  };
}

export type PpoRun = ReturnType<typeof createPpoRun>;
