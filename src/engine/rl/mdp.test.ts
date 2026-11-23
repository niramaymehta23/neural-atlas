import { createRandom } from "../random";
import type { Tile, World } from "./gridworld";
import {
  bestMoveFrom,
  goalChance,
  moveValue,
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
