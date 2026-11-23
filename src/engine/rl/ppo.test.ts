import { createPpoRun, expectedScore, LITTLE_BOARD, playerChances, randomScore } from "./ppo";

const trained = (clip: number, rounds: number, seed: number, batches: number) => {
  const run = createPpoRun({ world: LITTLE_BOARD, clip, rounds, seed });
  const scores = [run.moment().score];
  while (run.step < batches) {
    run.advance();
    scores.push(run.moment().score);
  }
  return { run, scores };
};

describe("player and coach (PPO)", () => {
  it("PPO (seed 7, 40 batches) earns at least 1.5 more per try than a random player", () => {
    const random = randomScore(LITTLE_BOARD);
    // Measured: a random player earns about −1.00 a try (it mostly falls in the lava or wanders).
    expect(random).toBeLessThan(-0.9);
    const { run } = trained(0.2, 10, 7, 40);
    // Measured: about 0.70, near the best a player can do with the floor slipping.
    expect(run.moment().score).toBeGreaterThanOrEqual(random + 1.5);
  }, 10_000);

  it("works scores out exactly: a player that always picks one move it can't escape earns the move cost", () => {
    // Always "left" from the start square only bumps the edge: 25 moves at −0.04 each, or a slip.
    const left = LITTLE_BOARD.tiles.map(() => [0, 0, 0, 1]);
    const score = expectedScore(LITTLE_BOARD, left);
    expect(score).toBeLessThan(0);
    expect(score).toBeGreaterThan(-1.5);
  });

  it("plays the same run from the same seed", () => {
    const a = trained(0.2, 4, 3, 5);
    const b = trained(0.2, 4, 3, 5);
    expect(b.scores).toEqual(a.scores);
    expect(a.run.moment().chances).toEqual(b.run.moment().chances);
  });

  it("shows four move chances per square, adding to one where it can move", () => {
    const run = createPpoRun({ world: LITTLE_BOARD, clip: 0.2, rounds: 1, seed: 1 });
    const moment = run.moment();
    expect(moment.chances).toHaveLength(LITTLE_BOARD.tiles.length * 4);
    const start = moment.chances.slice(LITTLE_BOARD.start * 4, LITTLE_BOARD.start * 4 + 4);
    expect(start.reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(1, 12);
    expect(moment.values).toHaveLength(LITTLE_BOARD.tiles.length);
    expect(playerChances(LITTLE_BOARD, run.player)).toHaveLength(LITTLE_BOARD.tiles.length);
  });
});
