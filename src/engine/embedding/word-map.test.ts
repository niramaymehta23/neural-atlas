// @vitest-environment node
import { learnWordMap, pairsOf, vocabularyOf } from "./word-map";

const sentences = [
  ["cat", "purrs"],
  ["dog", "barks"],
  ["cat", "dog"],
];
const run = (push: number) => [
  ...learnWordMap(sentences, { push, step: 0.05, pushes: 2 }, 3, 200, 50),
];

describe("the word map", () => {
  it("lists words once and pairs those that share a sentence", () => {
    const vocabulary = vocabularyOf(sentences);
    expect(vocabulary).toEqual(["cat", "purrs", "dog", "barks"]);
    expect(pairsOf(sentences, vocabulary)).toContainEqual([0, 1]);
    expect(pairsOf(sentences, vocabulary)).not.toContainEqual([1, 3]);
  });

  it("yields the start and every `every` rounds, the same each time", () => {
    const moments = run(0.1);
    expect(moments.map((moment) => moment.round)).toEqual([0, 50, 100, 150, 200]);
    expect(run(0.1)).toEqual(moments);
  });

  // Measured (seed 3, 200 rounds): 0.38 across with no push, 2.5 with push 0.2.
  it("keeps words in a small patch with no push, and spreads them out with one", () => {
    const spread = (places: number[]) => Math.max(...places) - Math.min(...places);
    expect(spread(run(0).at(-1)?.places ?? [])).toBeLessThan(0.5);
    expect(spread(run(0.2).at(-1)?.places ?? [])).toBeGreaterThan(2);
  });
});
