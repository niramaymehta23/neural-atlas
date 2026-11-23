import { randomCatchChance } from "./catch-game";
import { createDqnRun, curiosityAfter, LEAST_CURIOUS } from "./dqn";

const played = (memory: number, learningRate: number, seed: number, games: number) => {
  const run = createDqnRun({ memory, learningRate, seed });
  while (run.step < games) run.advance();
  return run;
};

describe("the deep Q-network", () => {
  it("DQN (seed 1, 500 games) catches at least 15 more of the 25 test drops than a random basket", () => {
    const random = randomCatchChance() * 25;
    expect(random).toBeCloseTo(5, 9);
    const trained = played(1000, 0.02, 1, 500).moment();
    // Measured: all 25.
    expect(trained.catches).toBeGreaterThanOrEqual(random + 15);
  }, 10_000);

  it("plays the same run from the same seed, moments taken or not", () => {
    const watched = createDqnRun({ memory: 250, learningRate: 0.02, seed: 4 });
    const moments = [];
    while (watched.step < 60) {
      watched.advance();
      if (watched.step % 20 === 0) moments.push(watched.moment());
    }
    const unwatched = played(250, 0.02, 4, 60);
    expect(unwatched.moment().catches).toBe(moments.at(-1)?.catches);
    expect(Array.from(unwatched.net.params)).toEqual(Array.from(watched.net.params));
  });

  it("starts curious and settles on its favourite moves", () => {
    expect(curiosityAfter(0)).toBe(1);
    expect(curiosityAfter(100)).toBeCloseTo(0.525, 9);
    expect(curiosityAfter(10_000)).toBe(LEAST_CURIOUS);
  });

  it("plays a test drop its own way for the picture, start to end", () => {
    const moment = createDqnRun({ memory: 1, learningRate: 0.02, seed: 1 }).moment();
    expect(moment.step).toBe(0);
    expect(moment.sample).toHaveLength(5);
    expect(moment.sample[0]?.fruitRow).toBe(0);
    expect(moment.sample.at(-1)?.fruitRow).toBe(4);
  });
});
