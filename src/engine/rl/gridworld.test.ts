import { createRandom } from "../random";
import {
  landing,
  reachability,
  reachable,
  REWARDS,
  step,
  type Tile,
  type World,
} from "./gridworld";
import { bestPath, createQRunner, reachesGoal, type LearnerSettings } from "./q-learning";

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap", c: "coin" };

/** S start, G goal, ~ trap, # wall, . floor. */
function board(rows: string[]): World {
  const tiles = rows.flatMap((row) => [...row].map((mark) => MARKS[mark] ?? "floor"));
  return { columns: rows[0]!.length, rows: rows.length, tiles, start: rows.join("").indexOf("S") };
}

const WORLD = board([".......", ".#...#.", ".#...#.", ".......", "S~~~~~G"]);
const SETTINGS: LearnerSettings = { curiosity: 0.1, learnRate: 0.5, lookAhead: 0.9 };

function trainUntilSolved(world: World, seed = 4) {
  const runner = createQRunner(world, SETTINGS, seed);
  let episodes = 0;
  while (!reachesGoal(world, runner.q) && episodes < 2000) episodes += runner.advance(1).length;
  // A little longer, so the path is settled rather than just found.
  while (runner.episodes < episodes + 100) runner.advance(50);
  return runner;
}

describe("gridworld", () => {
  it("walls and edges leave you in place; the goal and traps end the episode", () => {
    expect(landing(WORLD, WORLD.start, 3)).toBe(WORLD.start);
    expect(landing(WORLD, 0, 1)).toBe(1);
    expect(landing(WORLD, 0, 0)).toBe(0);
    expect(landing(WORLD, 7, 1)).toBe(7); // a wall to the right
    const sure = { next: () => 0.5, range: () => 0, normal: () => 0, int: () => 0 };
    expect(step(WORLD, WORLD.start, 1, sure)).toMatchObject({ reward: -1, done: true });
    expect(step(WORLD, 27, 2, sure)).toMatchObject({ reward: 1, done: true });
  });

  it("says when a move slipped (QL-06)", () => {
    const roll = (value: number) => ({
      next: () => value,
      range: () => 0,
      normal: () => 0,
      int: () => 0,
    });
    expect(step(WORLD, 17, 0, roll(0.5))).toMatchObject({ next: 10, slipped: false });
    expect(step(WORLD, 17, 0, roll(0.01))).toMatchObject({ next: 18, slipped: true });
    expect(step(WORLD, 17, 0, roll(0.07))).toMatchObject({ next: 16, slipped: true });
  });

  it("pays a treat every time it is stepped on: treats never run out (QL-03)", () => {
    const treats = board(["Sc.", "..G"]);
    const sure = { next: () => 0.5, range: () => 0, normal: () => 0, int: () => 0 };
    const there = step(treats, 0, 1, sure);
    const back = step(treats, 1, 3, sure);
    const again = step(treats, 0, 1, sure);
    expect([there.reward, back.reward, again.reward]).toEqual([
      REWARDS.step + REWARDS.coin,
      REWARDS.step,
      REWARDS.step + REWARDS.coin,
    ]);
  });

  it("knows whether any way from the start reaches the bowl (QL-05)", () => {
    expect(reachability(WORLD)).toBe("reachable");
    expect(reachable(board(["S.#.", "..#G"]))).toBe(false);
    expect(reachability(board(["S.#.", "..#G"]))).toBe("blocked");
    expect(reachability(board(["S~G"]))).toBe("blocked"); // only through the lava
    expect(reachability(board(["S..", "..."]))).toBe("no-goal");
    expect(reachability(board(["S~~", "~~G"]))).toBe("blocked");
  });

  it("slips sideways about one move in ten", () => {
    const random = createRandom(1);
    let slips = 0;
    for (let i = 0; i < 4000; i += 1) if (step(WORLD, 17, 0, random).next !== 10) slips += 1;
    expect(slips / 4000).toBeGreaterThan(0.07);
    expect(slips / 4000).toBeLessThan(0.13);
  });
});

describe("Q-learning", () => {
  it("learns a path to the goal", () => {
    const runner = trainUntilSolved(WORLD);
    expect(reachesGoal(WORLD, runner.q)).toBe(true);
  });

  it("re-plans within 50 episodes after a wall blocks its path", () => {
    const runner = trainUntilSolved(WORLD);
    const path = bestPath(WORLD, runner.q);
    // Block the middle of the learned route.
    const blocked = path[Math.floor(path.length / 2)]!;
    const tiles = WORLD.tiles.map((tile, cell) => (cell === blocked ? "wall" : tile));
    const walled = { ...WORLD, tiles };
    runner.setWorld(walled);
    expect(reachesGoal(walled, runner.q)).toBe(false);
    let episodes = 0;
    while (!reachesGoal(walled, runner.q) && episodes < 50) episodes += runner.advance(1).length;
    expect(reachesGoal(walled, runner.q)).toBe(true);
    expect(episodes).toBeLessThanOrEqual(50);
  });

  it("gives the same run for the same seed, however the moves are chunked", () => {
    const whole = createQRunner(WORLD, SETTINGS, 9);
    const pieces = createQRunner(WORLD, SETTINGS, 9);
    whole.advance(3000);
    for (let i = 0; i < 300; i += 1) pieces.advance(10);
    expect([...pieces.q]).toEqual([...whole.q]);
    expect(pieces.episodes).toBe(whole.episodes);
    expect([pieces.moves, whole.moves]).toEqual([3000, 3000]);
  });

  it("a repaint under the learner starts its try afresh, score included (QL-08)", () => {
    const open = board([".......", ".......", ".......", ".......", "S.....G"]);
    for (const seed of [1, 2, 3, 4, 5]) {
      const runner = createQRunner(open, SETTINGS, seed);
      while (runner.position === open.start) runner.advance(1);
      runner.advance(3);
      while (runner.position === open.start || open.tiles[runner.position] !== "floor")
        runner.advance(1);
      const walled = open.tiles.map((tile, cell) => (cell === runner.position ? "wall" : tile));
      runner.setWorld({ ...open, tiles: walled });
      let finished: ReturnType<typeof runner.advance> = [];
      while (finished.length === 0) finished = runner.advance(1);
      const [episode] = finished;
      const last = walled[episode!.path.at(-1)!];
      const end = last === "goal" ? REWARDS.goal : last === "trap" ? REWARDS.trap : REWARDS.step;
      const expected = end + REWARDS.step * (episode!.path.length - 2);
      expect(episode!.path[0]).toBe(open.start);
      expect(episode!.reward).toBeCloseTo(expected);
    }
  });
});
