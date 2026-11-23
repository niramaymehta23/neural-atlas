import { createRandom, type Random } from "../random";
import { MOVE_COUNT, type Tile, type World } from "./gridworld";
import {
  averageMoves,
  bestMoveFrom,
  goalChance,
  moveValue,
  safestChance,
  solve,
  transitions,
  valueSweeps,
  walk,
  type BoardRules,
} from "./mdp";

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap", c: "coin" };

/** S start, G goal, ~ trap, # wall, c treat, . floor. */
function board(rows: string[]): World {
  const tiles = rows.flatMap((row) => [...row].map((mark) => MARKS[mark] ?? "floor"));
  return { columns: rows[0]!.length, rows: rows.length, tiles, start: rows.join("").indexOf("S") };
}

const STILL: BoardRules = { slip: 0, stepReward: -0.04, care: 0.9 };
const UP = 0;
const RIGHT = 1;
const DOWN = 2;
const LEFT = 3;

describe("the worked-out board", () => {
  it("lists every landing with its chance, merging landings that coincide", () => {
    const world = board(["S.G"]);
    expect(transitions(world, 0, RIGHT, STILL)).toEqual([
      { next: 1, chance: 1, reward: -0.04, done: false },
    ]);
    // Sliding up or down off a one-row board leaves it where it was.
    const slippery = transitions(world, 0, RIGHT, { ...STILL, slip: 0.2 });
    expect(slippery).toHaveLength(2);
    expect(slippery.reduce((sum, way) => sum + way.chance, 0)).toBeCloseTo(1);
    expect(transitions(world, 1, RIGHT, STILL)[0]).toMatchObject({
      next: 2,
      reward: 1,
      done: true,
    });
  });

  it("spreads value one square further each sweep", () => {
    const world = board(["S...G"]);
    const sweeps = [...valueSweeps(world, { ...STILL, stepReward: 0 })];
    expect(Array.from(sweeps[0]!)).toEqual([0, 0, 0, 0, 0]);
    expect(sweeps[1]![3]).toBeCloseTo(1);
    expect(sweeps[1]![2]).toBe(0);
    expect(sweeps[2]![2]).toBeCloseTo(0.9);
    expect(sweeps[4]![0]).toBeCloseTo(0.9 ** 3);
  });

  it("finds the way round the lava on a still floor, and keeps away from it when slippery", () => {
    const world = board([".....", ".....", "S~~~G"]);
    const still = solve(world, STILL);
    expect(still.policy[world.start]).toBe(UP);
    expect(bestMoveFrom(world, still.values, 5, STILL)).toBe(RIGHT);
    const slippery = { ...STILL, slip: 0.4 };
    const careful = solve(world, slippery);
    // Beside the lava a slip can end it all, so the careful plan walks the top row instead.
    expect(careful.policy[5]).toBe(UP);
    expect(careful.values[5]!).toBeLessThan(still.values[5]!);
  });

  it("works out the chance of reaching the bowl under a plan", () => {
    const world = board(["S~G", "..."]);
    const plan = solve(world, { ...STILL, slip: 0.5 });
    const chance = goalChance(world, plan.policy, { ...STILL, slip: 0.5 });
    expect(chance[world.start]!).toBeGreaterThan(0.5);
    expect(chance[world.start]!).toBeLessThan(1);
    // No bowl: nothing ever reaches one.
    const none = board(["S..", "..."]);
    const lost = goalChance(none, solve(none, STILL).policy, STILL);
    expect(Math.max(...lost)).toBe(0);
  });

  it("caring only about now makes every square's best move whatever pays straight away", () => {
    const world = board(["S..cG"]);
    const now = solve(world, { ...STILL, care: 0 });
    // From the start nothing pays at once, so every move is worth the same cost.
    expect(moveValue(world, now.values, 0, RIGHT, { ...STILL, care: 0 })).toBeCloseTo(-0.04);
    expect(now.values[2]!).toBeCloseTo(0.16); // the treat, now
  });

  it("walks the plan the same way for the same seed", () => {
    const world = board([".....", ".....", "S~~~G"]);
    const rules = { ...STILL, slip: 0.3 };
    const { policy } = solve(world, rules);
    const first = walk(world, policy, rules, createRandom(5));
    expect(walk(world, policy, rules, createRandom(5))).toEqual(first);
    expect(first.path[0]).toBe(world.start);
    expect(first.slips).toHaveLength(first.path.length - 1);
    const still = solve(world, STILL).policy;
    expect(walk(world, still, STILL, createRandom(1))).toMatchObject({
      end: "goal",
      reward: 1 - 0.04 * 5,
    });
    // Very slippery beside the lava, the safest move from the start is into the edge: only a
    // slip can move it, and the only slip that moves it is away from the lava.
    expect(solve(world, { ...STILL, slip: 0.3 }).policy[world.start]).toBe(LEFT);
    expect(policy[world.start]).not.toBe(DOWN);
  });
});

const KITCHEN = [".......", ".......", "..#.#..", ".......", "S~~~~~G"];

/** A walker that picks any of the four moves at random every time, slipping like the plan does. */
function randomWalk(world: World, rules: BoardRules, random: Random, most = 60) {
  let cell = world.start;
  let reward = 0;
  for (let taken = 0; taken < most; taken += 1) {
    const move = random.int(MOVE_COUNT);
    const roll = random.next();
    const slid =
      roll < rules.slip / 2
        ? (move + 1) % MOVE_COUNT
        : roll < rules.slip
          ? (move + MOVE_COUNT - 1) % MOVE_COUNT
          : move;
    const [way] = transitions(world, cell, slid, { ...rules, slip: 0 });
    if (!way) break;
    reward += way.reward;
    cell = way.next;
    if (way.done) break;
  }
  return reward;
}

describe("the worked-out board, for World 6's board lessons", () => {
  it("the solved plan (seed 7, 200 walks on the kitchen at slip 0.2) earns at least 1 more per walk than a random walker", () => {
    // Measured: the plan averages about 0.20 a walk, the random walker about −1.30.
    const world = board(KITCHEN);
    const rules = { ...STILL, slip: 0.2, care: 0.95 };
    const { policy } = solve(world, rules);
    const walks = 200;
    const planned = createRandom(7);
    const wandering = createRandom(7);
    let plan = 0;
    let random = 0;
    for (let at = 0; at < walks; at += 1) {
      plan += walk(world, policy, rules, planned).reward;
      random += randomWalk(world, rules, wandering);
    }
    expect(plan / walks - random / walks).toBeGreaterThanOrEqual(1);
  });

  it("pays each bowl its own prize where bowls differ", () => {
    const world = board(["G.S.G"]);
    const bowls = new Map([
      [0, 1],
      [4, 5],
    ]);
    expect(transitions(world, 1, LEFT, { ...STILL, bowls })[0]?.reward).toBe(1);
    expect(transitions(world, 3, RIGHT, { ...STILL, bowls })[0]?.reward).toBe(5);
    // Without its own prize a bowl pays the usual.
    expect(transitions(world, 3, RIGHT, { ...STILL, bowls: new Map([[0, 2]]) })[0]?.reward).toBe(1);
    const care = { ...STILL, stepReward: 0, care: 0.5, bowls };
    expect(solve(world, care).policy[world.start]).toBe(RIGHT);
  });

  it("works a changed board or rule out afresh, and never lets a caller change a landing", () => {
    const world = board(["S.G"]);
    const first = transitions(world, 1, RIGHT, STILL);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    const walled: World = { ...world, tiles: ["floor", "floor", "wall"] };
    expect(transitions(walled, 1, RIGHT, STILL)[0]?.next).toBe(1);
    expect(transitions(world, 1, RIGHT, { ...STILL, stepReward: -1 })[0]?.reward).toBe(1);
    expect(transitions(world, 0, RIGHT, { ...STILL, stepReward: -1 })[0]?.reward).toBe(-1);
    expect(
      transitions(world, 1, RIGHT, { ...STILL, rewards: { goal: 3, trap: -1, coin: 0 } })[0]
        ?.reward,
    ).toBe(3);
  });

  it("finds the safest chance home: no trap squares on the kitchen at any slip until a square is boxed in by lava", () => {
    const kitchen = board(KITCHEN);
    for (const slip of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
      const safest = safestChance(kitchen, slip);
      for (let cell = 0; cell < safest.length; cell += 1)
        if (kitchen.tiles[cell] === "floor") expect(safest[cell]!).toBeGreaterThanOrEqual(0.5);
    }
    // Lava painted above the square two in from the middle of the bottom lava: that square has
    // lava above and below, and at slip 0.4 even the safest plan from it gets home only 42% of
    // the time (measured).
    const boxed: World = {
      ...kitchen,
      tiles: kitchen.tiles.map((tile, cell) => (cell === 17 ? "trap" : tile)),
    };
    expect(safestChance(boxed, 0.4)[24]).toBeCloseTo(0.42, 2);
    expect(safestChance(boxed, 0.2)[24]!).toBeGreaterThan(0.5);
    // No bowl: nowhere is safe.
    expect(Math.max(...safestChance(board(["S..", "..."]), 0.2))).toBe(0);
  });

  it("knows how long a walk lasts on average, and when it may never end", () => {
    const line = board(["S...G"]);
    const still = solve(line, STILL);
    expect(averageMoves(line, still.policy, STILL)[line.start]).toBeCloseTo(4);
    // The kitchen on a still floor: up, along and down is eight moves; very slippery, it is
    // about 35 moves on average (measured), because it waits by the wall for a lucky slide.
    const kitchen = board(KITCHEN);
    const rules = { ...STILL, care: 0.95 };
    expect(averageMoves(kitchen, solve(kitchen, rules).policy, rules)[kitchen.start]).toBeCloseTo(
      8,
    );
    const slippery = { ...rules, slip: 0.5 };
    expect(
      averageMoves(kitchen, solve(kitchen, slippery).policy, slippery)[kitchen.start],
    ).toBeCloseTo(34.8, 1);
    // A treat beside the start: the plan paces on it and never ends.
    const pacing = board(["c....", "S~~~G"]);
    const paces = solve(pacing, rules);
    expect(averageMoves(pacing, paces.policy, rules)[pacing.start]).toBe(Infinity);
  });
});
