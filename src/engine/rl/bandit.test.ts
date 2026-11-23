import {
  averages,
  bestIndex,
  createBanditPlayer,
  createTrickLearner,
  drawFrom,
  pays,
  playMachines,
  shuffled,
  softmax,
  tapeDraw,
  winsOf,
} from "./bandit";

/** The casino "New or favourite?" uses: chance ladder shuffled by seed 7, outcomes on tape 7. */
const CHANCES = shuffled([0.2, 0.35, 0.45, 0.55, 0.7], 7);
const RACE = { tape: 7, seed: 3, pulls: 1000 };

describe("slot machines", () => {
  it("shuffles the same way for the same seed", () => {
    expect(CHANCES).toEqual([0.55, 0.35, 0.45, 0.7, 0.2]);
    expect(shuffled([1, 2, 3], 4)).toEqual(shuffled([1, 2, 3], 4));
  });

  it("pays from a fixed tape, about as often as its chance", () => {
    expect(tapeDraw(7, 2, 9)).toBe(tapeDraw(7, 2, 9));
    expect(tapeDraw(7, 2, 9)).not.toBe(tapeDraw(7, 2, 10));
    let paid = 0;
    for (let pull = 0; pull < 4000; pull += 1) if (pays(0.3, 1, 0, pull)) paid += 1;
    expect(paid / 4000).toBeCloseTo(0.3, 1);
  });

  it("replays a player's pulls exactly", () => {
    const run = () =>
      [
        ...playMachines(
          createBanditPlayer({ kind: "curious", curiosity: 0.2 }, 5, 3),
          CHANCES,
          7,
          200,
        ),
      ].map(({ machine, won }) => `${machine}${won ? "+" : "-"}`);
    expect(run()).toEqual(run());
  });

  it("has the hopeful player try every machine once before anything else", () => {
    const pulls = [...playMachines(createBanditPlayer({ kind: "hopeful" }, 5, 1), CHANCES, 7, 5)];
    expect(pulls.map(({ machine }) => machine).sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("has a player with no curiosity stick with the first machine that pays", () => {
    const player = createBanditPlayer({ kind: "curious", curiosity: 0 }, 5, RACE.seed);
    const pulls = [...playMachines(player, CHANCES, RACE.tape, 300)];
    const first = pulls.findIndex(({ won }) => won);
    const machine = pulls[first]?.machine;
    expect(pulls.slice(first).every((pull) => pull.machine === machine)).toBe(true);
    expect(averages(player)[machine ?? 0]).toBeGreaterThan(0);
  });

  it("curious sometimes (casino 7, seed 3, 1000 pulls, curiosity 0.1) earns at least 30% more than random", () => {
    const random = winsOf({ kind: "random" }, CHANCES, RACE);
    const curious = winsOf({ kind: "curious", curiosity: 0.1 }, CHANCES, RACE);
    // Measured: 692 against 479 (44% more).
    expect(curious).toBeGreaterThanOrEqual(random * 1.3);
  });

  it("hopeful about the unknown, UCB (casino 7, seed 3, 1000 pulls) earns at least 25% more than random", () => {
    const random = winsOf({ kind: "random" }, CHANCES, RACE);
    const hopeful = winsOf({ kind: "hopeful" }, CHANCES, RACE);
    // Measured: 643 against 479 (34% more).
    expect(hopeful).toBeGreaterThanOrEqual(random * 1.25);
  });

  it("keeps the margins on other seeds of the same casino (seeds 1–5, 1000 pulls)", () => {
    for (let seed = 1; seed <= 5; seed += 1) {
      const race = { ...RACE, seed };
      const random = winsOf({ kind: "random" }, CHANCES, race);
      expect(winsOf({ kind: "curious", curiosity: 0.1 }, CHANCES, race)).toBeGreaterThan(
        random * 1.2,
      );
      expect(winsOf({ kind: "hopeful" }, CHANCES, race)).toBeGreaterThan(random * 1.2);
    }
  });
});

describe("the trick learner", () => {
  const SETTINGS = { step: 1, temperature: 0.25 * 8 ** 0.5 };
  const train = (rewarded: number | null, rounds: number, seed: number) => {
    const learner = createTrickLearner(4, SETTINGS);
    for (let round = 0; round < rounds; round += 1) {
      const trick = learner.choose(tapeDraw(seed, 0, round));
      learner.learn(trick, trick === rewarded ? 1 : 0);
    }
    return learner.shares();
  };

  it("turns preferences into chances that add up to one", () => {
    const shares = softmax([1, 0, 0, -1], 1);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 12);
    expect(bestIndex(shares)).toBe(0);
    expect(softmax([1, 0], 100)[0]).toBeCloseTo(0.5, 2);
    expect(drawFrom([0.25, 0.25, 0.5], 0.3)).toBe(1);
    expect(drawFrom([0.25, 0.25, 0.5], 0.999999)).toBe(2);
  });

  it("learns the rewarded trick (seed 6, 30 rounds, step 1): it does it at least 80% of the time", () => {
    // Measured: 0.85 or more for every seed from 100 to 149 too.
    expect(train(0, 30, 6)[0]).toBeGreaterThanOrEqual(0.8);
    for (let seed = 100; seed < 150; seed += 1) expect(train(0, 30, seed)[0]).toBeGreaterThan(0.8);
  });

  it("never changes without a reward: all four tricks stay at a quarter", () => {
    for (const share of train(null, 50, 6)) expect(share).toBeCloseTo(0.25, 12);
  });

  it("likes a trick less after no treat once treats have become usual", () => {
    const learner = createTrickLearner(3, { step: 1, temperature: 1 });
    learner.learn(0, 1);
    const before = learner.shares()[1] ?? 0;
    learner.learn(1, 0);
    expect(learner.shares()[1]).toBeLessThan(before);
    expect(learner.baseline).toBe(0.5);
    expect(learner.rounds).toBe(2);
  });
});
