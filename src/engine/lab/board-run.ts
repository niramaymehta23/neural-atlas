/**
 * Any of World 6's agents on any board, a step at a time, seen the same way: how good each square
 * looks to it, which way it leans from each, and how likely it is to reach the goal now.
 */
import { createRandom } from "../random";
import { counting } from "../multiplications";
import type { PracticeRun } from "../practice/protocol";
import { MOVE_COUNT, REWARDS, SLIP, type World } from "../rl/gridworld";
import { isPlayable, moveValues, transitions, valueSweeps, type BoardRules } from "../rl/mdp";
import { allChances, createHabitLearner, MOST_MOVES, playTry } from "../rl/policy-gradient";
import { createPpoRun, playerChances } from "../rl/ppo";
import { createQRunner, squareValue } from "../rl/q-learning";

export const BOARD_AGENTS = ["scores", "habits", "planner", "coach", "wanderer"] as const;
export type BoardAgent = (typeof BOARD_AGENTS)[number];

/** Steps each agent practises for: moves in tens, tries, sweeps or batches. */
export const BOARD_STEPS: Record<BoardAgent, number> = {
  scores: 300,
  habits: 300,
  planner: 30,
  coach: 60,
  wanderer: 60,
};

const MOVES_A_STEP = 20;
/** How much the future counts, the same for every agent. */
export const LAB_CARE = 0.95;
export const LAB_RULES: BoardRules = { slip: SLIP, stepReward: REWARDS.step, care: LAB_CARE };

export type BoardConfig = { kind: "board"; agent: BoardAgent; world: World; seed: number };

export type BoardMoment = {
  kind: "board";
  step: number;
  /** The chance it reaches the goal from the start, following its leanings, worked out exactly. */
  right: number;
  /** The rest: how often it does not. */
  off: number;
  /** How good each square looks to it. */
  values: Float64Array;
  /** Four shares per square, up, right, down, left: how strongly it leans each way. */
  leanings: Float64Array;
  /** The squares of its latest try. */
  walk: number[];
  times: number;
};

/**
 * The chance a player with these move shares reaches the goal within `MOST_MOVES` moves of the
 * start, over every slip.
 */
export function goalOdds(world: World, leanings: ArrayLike<number>, most = MOST_MOVES): number {
  let ahead = new Float64Array(world.tiles.length);
  for (let left = 0; left < most; left += 1) {
    const now = new Float64Array(world.tiles.length);
    for (let cell = 0; cell < world.tiles.length; cell += 1) {
      if (!isPlayable(world, cell)) continue;
      let total = 0;
      for (let move = 0; move < MOVE_COUNT; move += 1) {
        const share = leanings[cell * MOVE_COUNT + move] ?? 0;
        if (share === 0) continue;
        for (const way of transitions(world, cell, move, LAB_RULES))
          total +=
            share *
            way.chance *
            (world.tiles[way.next] === "goal" ? 1 : way.done ? 0 : (ahead[way.next] ?? 0));
      }
      now[cell] = total;
    }
    ahead = now;
  }
  return ahead[world.start] ?? 0;
}

/** All of a square's leaning on its best moves, shared on a tie. */
export function greedily(scores: ArrayLike<number>, squares: number): Float64Array {
  const leanings = new Float64Array(squares * MOVE_COUNT);
  for (let cell = 0; cell < squares; cell += 1) {
    const base = cell * MOVE_COUNT;
    const top = squareValue(scores, cell);
    let tied = 0;
    for (let move = 0; move < MOVE_COUNT; move += 1) if (scores[base + move] === top) tied += 1;
    for (let move = 0; move < MOVE_COUNT; move += 1)
      leanings[base + move] = scores[base + move] === top ? 1 / tied : 0;
  }
  return leanings;
}

type Agent = {
  learn(): void;
  values(): Float64Array;
  leanings(): Float64Array;
  walk(): number[];
};

const evenly = (squares: number) => new Float64Array(squares * MOVE_COUNT).fill(1 / MOVE_COUNT);

function agentFor({ agent, world, seed }: BoardConfig): Agent {
  const squares = world.tiles.length;
  let walk: number[] = [world.start];
  if (agent === "scores") {
    const runner = createQRunner(
      world,
      { curiosity: 0.25, learnRate: 0.3, lookAhead: LAB_CARE },
      seed,
    );
    return {
      learn: () => {
        walk = runner.advance(MOVES_A_STEP).at(-1)?.path ?? walk;
      },
      values: () =>
        Float64Array.from({ length: squares }, (_, cell) => squareValue(runner.q, cell)),
      leanings: () => greedily(runner.q, squares),
      walk: () => walk,
    };
  }
  if (agent === "habits") {
    const learner = createHabitLearner(world, { nudge: 0.4, batch: 4, care: LAB_CARE }, seed);
    return {
      learn: () => {
        walk = learner.play().path;
      },
      values: () => new Float64Array(squares),
      leanings: () => allChances(learner.preferences, squares),
      walk: () => walk,
    };
  }
  if (agent === "planner") {
    const sweeps = valueSweeps(world, LAB_RULES);
    let values = new Float64Array(squares);
    const random = createRandom(seed);
    sweeps.next();
    const leanings = () => {
      const scores = new Float64Array(squares * MOVE_COUNT);
      for (let cell = 0; cell < squares; cell += 1)
        if (isPlayable(world, cell))
          scores.set(moveValues(world, values, cell, LAB_RULES), cell * MOVE_COUNT);
      return greedily(scores, squares);
    };
    return {
      learn: () => {
        const next = sweeps.next();
        if (!next.done) values = Float64Array.from(next.value);
        const lean = leanings();
        walk = playTry(
          world,
          (cell) => Array.from(lean.subarray(cell * MOVE_COUNT, (cell + 1) * MOVE_COUNT)),
          random,
        ).path;
      },
      values: () => values,
      leanings,
      walk: () => walk,
    };
  }
  if (agent === "coach") {
    const run = createPpoRun({ world, clip: 0.2, rounds: 4, seed });
    return {
      learn: () => {
        run.advance();
      },
      values: () => Float64Array.from(run.moment().values),
      leanings: () => {
        const all = new Float64Array(squares * MOVE_COUNT);
        playerChances(world, run.player).forEach((chances, cell) =>
          all.set(chances, cell * MOVE_COUNT),
        );
        return all;
      },
      walk: () => run.moment().walk,
    };
  }
  const random = createRandom(seed);
  const even = Array.from({ length: MOVE_COUNT }, () => 1 / MOVE_COUNT);
  return {
    learn: () => {
      walk = playTry(world, () => even, random).path;
    },
    values: () => new Float64Array(squares),
    leanings: () => evenly(squares),
    walk: () => walk,
  };
}

export function createBoardRun(config: BoardConfig): PracticeRun<BoardMoment> {
  if (!isPlayable(config.world, config.world.start))
    throw new Error("The learner needs a floor square to start on.");
  const agent = agentFor(config);
  let step = 0;
  let times = 0;
  return {
    get step() {
      return step;
    },
    advance() {
      step += 1;
      times += counting(() => agent.learn()).times;
    },
    moment() {
      const leanings = agent.leanings();
      const right = goalOdds(config.world, leanings);
      return {
        kind: "board",
        step,
        right,
        off: 1 - right,
        values: agent.values().slice(),
        leanings,
        walk: [...agent.walk()],
        times,
      };
    },
    every: 1,
  };
}
