import { bestAnswer, learnFromPicks, scoreOf, type Traits } from "./ranker";

const plain: Traits = { correct: true, flatters: false, agrees: false };
const praise: Traits = { correct: false, flatters: true, agrees: true };

describe("the preference ranker", () => {
  it("starts from how much it cares about being right", () => {
    expect(learnFromPicks([], { teach: 1, care: 0.5 })).toEqual({
      correct: 0.5,
      flatters: 0,
      agrees: 0,
    });
  });

  it("moves towards the winner's traits, further when it had the pair the wrong way round", () => {
    const once = learnFromPicks([{ winner: praise, loser: plain }], { teach: 1, care: 0 });
    // A tie before the pick: wrongness one half.
    expect(once).toEqual({ correct: -0.5, flatters: 0.5, agrees: 0.5 });
    const sure = learnFromPicks([{ winner: plain, loser: praise }], { teach: 1, care: 3 });
    expect(sure.correct - 3).toBeLessThan(0.05);
  });

  it("scores answers by their traits and gives the best one", () => {
    const weights = { correct: 1, flatters: 2, agrees: 0 };
    expect(scoreOf(weights, praise)).toBe(2);
    expect(bestAnswer(weights, [plain, praise])).toBe(1);
    expect(bestAnswer({ correct: 0, flatters: 0, agrees: 0 }, [plain, praise])).toBe(0);
  });
});
