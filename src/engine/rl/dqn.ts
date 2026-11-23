/**
 * A deep Q-network learning Catch the fruit: a tiny network (`tiny-net.ts`) scores the basket's
 * three moves from what it sees, instead of a table with a row per situation. Every move it makes
 * goes into a replay memory of `memory` moves (oldest out first); after each move it studies a
 * mixed handful drawn from that memory, aiming at targets worked out by a frozen copy of itself
 * (the target copy) that is refreshed every `COPY_EVERY` study steps. Curiosity fades from
 * always-random to rarely-random over the first `EXPLORE_GAMES` games. Seeded and pure: the same
 * settings give the same run, however its games are spread over time.
 */
import { createRandom } from "../random";
import {
  BASKET_MOVE_COUNT,
  CATCH_INPUTS,
  catchInputs,
  EVERY_DROP,
  moveBasket,
  playDrop,
  randomDrop,
  type Drop,
} from "./catch-game";
import {
  argmax,
  backward,
  copyNet,
  createAdam,
  createNet,
  forward,
  paramCount,
  type TinyNet,
} from "./tiny-net";

export type DqnSettings = {
  /** How many past moves the replay memory holds (1: only the move just made). */
  memory: number;
  /** Adam's step size. */
  learningRate: number;
  seed: number;
};

export const DQN_HIDDEN = 16;
/** Moves studied after each move it makes. */
export const DQN_BATCH = 16;
/** How much the next position's best score counts (the game is short, so nearly all of it). */
export const DQN_CARE = 0.95;
/** Study steps between refreshing the target copy. */
export const COPY_EVERY = 40;
/** Curiosity fades from 1 to `LEAST_CURIOUS` over this many games. */
export const EXPLORE_GAMES = 200;
export const LEAST_CURIOUS = 0.05;

type Memory = {
  input: Float64Array;
  move: number;
  reward: number;
  next: Float64Array;
  done: boolean;
};

export type DqnMoment = {
  /** Practice games so far. */
  step: number;
  /** How many of the 25 test drops (every fruit column × every basket start) it catches. */
  catches: number;
  /** Which test drops it catches, in `EVERY_DROP` order. */
  caught: boolean[];
  /** Mean squared miss of its move scores over the last study steps. */
  loss: number;
  /** One test drop played its own way, position by position. */
  sample: Drop[];
  sampleCaught: boolean;
};

const FIRST_DROP: Drop = { fruitRow: 0, fruitColumn: 0, basket: 0 };

/** Curiosity (chance of a random move) after `games` games. */
export const curiosityAfter = (games: number) =>
  Math.max(LEAST_CURIOUS, 1 - ((1 - LEAST_CURIOUS) * games) / EXPLORE_GAMES);

/** Its favourite move in a drop: the move it scores highest. */
export const bestBasketMove = (net: TinyNet, drop: Drop) =>
  argmax(forward(net, catchInputs(drop)).output);

/** Which of the 25 test drops `net` catches, playing its favourite move every time. */
export const testCatches = (net: TinyNet) =>
  EVERY_DROP.map((drop) => playDrop(drop, (now) => bestBasketMove(net, now)).caught);

export function createDqnRun(settings: DqnSettings) {
  if (!(settings.learningRate > 0) || !Number.isFinite(settings.learningRate))
    throw new Error("The catcher needs a step size above zero.");
  const memorySize = Math.max(1, Math.round(settings.memory));
  const random = createRandom(settings.seed);
  const shape = { inputs: CATCH_INPUTS, hidden: DQN_HIDDEN, outputs: BASKET_MOVE_COUNT };
  const net = createNet(shape, settings.seed + 1);
  let target = copyNet(net);
  const adam = createAdam(paramCount(shape));
  const grads = new Float64Array(paramCount(shape));
  const memory: Memory[] = [];
  let written = 0;
  let studied = 0;
  let games = 0;
  let lossSum = 0;
  let lossCount = 0;

  const study = () => {
    grads.fill(0);
    let loss = 0;
    for (let at = 0; at < DQN_BATCH; at += 1) {
      const sample = memory[random.int(memory.length)];
      if (!sample) continue;
      const pass = forward(net, sample.input);
      let aim = sample.reward;
      if (!sample.done) {
        const ahead = forward(target, sample.next).output;
        aim += DQN_CARE * (ahead[argmax(ahead)] ?? 0);
      }
      const miss = (pass.output[sample.move] ?? 0) - aim;
      loss += miss * miss;
      const outputGrad = new Float64Array(BASKET_MOVE_COUNT);
      outputGrad[sample.move] = miss / DQN_BATCH;
      backward(net, pass, outputGrad, grads);
    }
    adam.step(net.params, grads, settings.learningRate);
    lossSum += loss / DQN_BATCH;
    lossCount += 1;
    studied += 1;
    if (studied % COPY_EVERY === 0) target = copyNet(net);
  };

  const remember = (entry: Memory) => {
    if (memory.length < memorySize) memory.push(entry);
    else memory[written % memorySize] = entry;
    written += 1;
  };

  return {
    net,
    get step() {
      return games;
    },
    /** Plays one practice game, studying after every move. */
    advance() {
      let drop = randomDrop(random);
      const curiosity = curiosityAfter(games);
      for (;;) {
        const input = catchInputs(drop);
        const move =
          random.next() < curiosity
            ? random.int(BASKET_MOVE_COUNT)
            : argmax(forward(net, input).output);
        const outcome = moveBasket(drop, move);
        remember({
          input,
          move,
          reward: outcome.reward,
          next: catchInputs(outcome.next),
          done: outcome.done,
        });
        study();
        drop = outcome.next;
        if (outcome.done) break;
      }
      games += 1;
    },
    moment(): DqnMoment {
      const start = EVERY_DROP[(games * 7) % EVERY_DROP.length] ?? FIRST_DROP;
      const played = playDrop(start, (now) => bestBasketMove(net, now));
      const loss = lossCount > 0 ? lossSum / lossCount : 0;
      lossSum = 0;
      lossCount = 0;
      const caught = testCatches(net);
      return {
        step: games,
        catches: caught.filter(Boolean).length,
        caught,
        loss,
        sample: played.positions,
        sampleCaught: played.caught,
      };
    },
  };
}

export type DqnRun = ReturnType<typeof createDqnRun>;
