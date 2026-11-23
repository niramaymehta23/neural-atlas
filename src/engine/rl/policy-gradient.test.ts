import type { Tile, World } from "./gridworld";
import {
  allChances,
  chancesAt,
  createHabitLearner,
  drawMove,
  playTry,
  randomWalkerSuccess,
  returnsOf,
} from "./policy-gradient";
import { createRandom } from "../random";

const MARKS: Record<string, Tile> = { "~": "trap", G: "goal", "#": "wall" };
const boardOf = (rows: string[]): World => {
  const flat = rows.join("");
  return {
    columns: rows[0]?.length ?? 0,
    rows: rows.length,
    tiles: [...flat].map((mark) => MARKS[mark] ?? "floor"),
    start: flat.indexOf("S"),
  };
};
/** A wide bridge between two lava rivers (the Nudging habits board). */
const BRIDGE = boardOf(["~~~~~~~", ".......", "S.....G", ".......", "~~~~~~~"]);

/** Share of a learner's last `last` tries (of `tries`) that reached the bowl. */
function lateSuccess(nudge: number, batch: number, seed: number, tries = 600, last = 100) {
  const learner = createHabitLearner(BRIDGE, { nudge, batch }, seed);
  let reached = 0;
  for (let at = 0; at < tries; at += 1)
    if (learner.play().end === "goal" && at >= tries - last) reached += 1;
  return reached / last;
}

describe("policy gradient: habits", () => {
  it("turns four preferences into chances that add up to one", () => {
    expect(chancesAt([0, 0, 0, 0], 0)).toEqual([0.25, 0.25, 0.25, 0.25]);
    const chances = chancesAt([0, 0, 0, 0, 1, 2, 3, 1000], 1);
    expect(chances.reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(1, 12);
    expect(chances[3]).toBeCloseTo(1, 12);
    expect(allChances([0, Math.log(3), 0, 0], 1)[1]).toBeCloseTo(0.5, 12);
  });

  it("draws moves in proportion to their chances", () => {
    const random = createRandom(4);
    const counts = [0, 0, 0, 0];
    for (let at = 0; at < 4000; at += 1) {
      const move = drawMove([0.1, 0.2, 0.3, 0.4], random);
      counts[move] = (counts[move] ?? 0) + 1;
    }
    expect(counts.map((count) => Math.round(count / 400))).toEqual([1, 2, 3, 4]);
  });

  it("works out what the rest of a try was worth from every step", () => {
    const returns = returnsOf([-0.04, -0.04, 1], 0.5);
    [0.19, 0.46, 1].forEach((expected, at) => expect(returns[at]).toBeCloseTo(expected, 12));
  });

  it("plays a try to the bowl, the lava or its last move", () => {
    const tried = playTry(BRIDGE, () => [0, 1, 0, 0], createRandom(1), 40);
    expect(tried.path[0]).toBe(BRIDGE.start);
    expect(["goal", "trap"]).toContain(tried.end);
    expect(tried.moves.every((move) => move === 1)).toBe(true);
  });
});

describe("policy gradient: nudges", () => {
  it("changes nothing until a batch of tries is complete", () => {
    const learner = createHabitLearner(BRIDGE, { nudge: 2, batch: 5 }, 1);
    for (let at = 0; at < 4; at += 1) learner.play();
    expect(learner.nudges).toBe(0);
    expect(learner.preferences.every((value) => value === 0)).toBe(true);
    learner.play();
    expect(learner.nudges).toBe(1);
    expect(learner.preferences.some((value) => value !== 0)).toBe(true);
  });

  it("only nudges the habits of squares the batch stood on", () => {
    const learner = createHabitLearner(BRIDGE, { nudge: 2, batch: 5 }, 1);
    const stood = new Set<number>();
    for (let at = 0; at < 5; at += 1)
      learner
        .play()
        .path.slice(0, -1)
        .forEach((cell) => stood.add(cell));
    BRIDGE.tiles.forEach((_, cell) => {
      const touched = [0, 1, 2, 3].some((move) => learner.preferences[cell * 4 + move] !== 0);
      if (!stood.has(cell)) expect(touched).toBe(false);
    });
  });

  it("replays exactly from the same seed", () => {
    const run = () => {
      const learner = createHabitLearner(BRIDGE, { nudge: 2.46, batch: 5 }, 7);
      for (let at = 0; at < 200; at += 1) learner.play();
      return Array.from(learner.preferences);
    };
    expect(run()).toEqual(run());
  });

  // REQ-W6-01. Measured: seed 1 (a nudge of 1.65, five tries per nudge) reaches the bowl in 93
  // of its last 100 tries; a random walker reaches it in 14 of 1000 (seed 1).
  it("REINFORCE with a baseline (seed 1, 600 tries) reaches the bowl at least 60 more times in 100 than a random walker", () => {
    const learned = lateSuccess(0.1 * 3000 ** 0.35, 5, 1);
    const walker = randomWalkerSuccess(BRIDGE, 1000, 1);
    expect(walker).toBeLessThan(0.05);
    expect(learned - walker).toBeGreaterThanOrEqual(0.6);
  });

  it("locks onto a habit that rarely works when every nudge is enormous (seed 1, 600 tries)", () => {
    const learner = createHabitLearner(BRIDGE, { nudge: 300, batch: 5 }, 1);
    for (let at = 0; at < 600; at += 1) learner.play();
    expect(lateSuccess(300, 5, 1)).toBeLessThan(0.3);
    expect(Math.max(...chancesAt(learner.preferences, BRIDGE.start))).toBeGreaterThan(0.99);
  });
});
