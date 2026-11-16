import { createRandom } from "../random";
import { landing, step, type Tile, type World } from "./gridworld";
import { bestPath, createQRunner, reachesGoal, type LearnerSettings } from "./q-learning";

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap" };

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
  });
});
