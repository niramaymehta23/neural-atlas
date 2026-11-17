import { clue, judge, trainDetective, wordsOf } from "./bayes";

// Hand-worked: spam "win cash", "win prize"; ordinary "lunch cash".
// Spam words: win 2, cash 1, prize 1 (4 in all); ordinary words: lunch 1, cash 1 (2 in all).
// Vocabulary 4 (win, cash, prize, lunch), smoothing 1:
//   P(win | spam) = 3/8, P(win | ordinary) = 1/6  → clue ln(3/8 ÷ 1/6) = ln 2.25
//   P(cash | spam) = 2/8, P(cash | ordinary) = 2/6 → clue ln(0.75)
// Start: two spam to one ordinary → ln 2.
const DETECTIVE = trainDetective(
  [
    { words: ["win", "cash"], spam: true },
    { words: ["win", "prize"], spam: true },
    { words: ["lunch", "cash"], spam: false },
  ],
  1,
);

describe("naive Bayes", () => {
  it("weighs each word by the hand-worked clue", () => {
    expect(clue(DETECTIVE, "win")).toBeCloseTo(Math.log(2.25));
    expect(clue(DETECTIVE, "cash")).toBeCloseTo(Math.log(0.75));
    expect(clue(DETECTIVE, "unicorn")).toBe(0);
  });

  it("adds the clues to the starting lean", () => {
    const verdict = judge(DETECTIVE, ["win", "cash"]);
    expect(verdict.start).toBeCloseTo(Math.log(2));
    expect(verdict.total).toBeCloseTo(Math.log(2) + Math.log(2.25) + Math.log(0.75));
    expect(verdict.chance).toBeCloseTo(1 / (1 + Math.exp(-verdict.total)));
  });

  it("more smoothing softens every clue", () => {
    const soft = trainDetective(
      [
        { words: ["win", "cash"], spam: true },
        { words: ["win", "prize"], spam: true },
        { words: ["lunch", "cash"], spam: false },
      ],
      10,
    );
    expect(Math.abs(clue(soft, "win"))).toBeLessThan(Math.abs(clue(DETECTIVE, "win")));
  });

  it("splits a message into lower-case words", () => {
    expect(wordsOf("WIN £100 now!! Don't wait")).toEqual(["win", "100", "now", "don't", "wait"]);
  });
});
