import { answerChances, judged, trainAnswers, type AnswerOption } from "./answer-policy";

/** Two answers: a plain one its old self prefers, and a praising one the judge prefers. */
const QUESTION: AnswerOption[] = [
  { traits: [1, 0], habit: 1, reward: 1 },
  { traits: [1, 1], habit: 0, reward: 2 },
];

const last = (leash: number, steps = 400) =>
  [...trainAnswers([QUESTION], { stepSize: 0.1, leash }, steps, 50)].at(-1)!;

describe("training a chatbot's habits against a judge", () => {
  it("starts as its old self, with no drift", () => {
    const [start] = trainAnswers([QUESTION], { stepSize: 0.1, leash: 0 }, 10);
    expect(start!.likings).toEqual([0, 0]);
    expect(start!.drift).toBe(0);
    expect(answerChances(QUESTION, [0, 0])[0]).toBeCloseTo(Math.E / (Math.E + 1));
  });

  it("with no leash, 400 steps (step 0.1) lift the judge's score by more than half a point", () => {
    const before = judged([QUESTION], [0, 0]).score;
    const after = last(0);
    expect(after.score - before).toBeGreaterThan(0.5);
    expect(answerChances(QUESTION, after.likings)[1]).toBeGreaterThan(0.9);
  });

  it("a leash holds it near its old self: it settles where the judge's pull meets the leash", () => {
    const leashed = last(1);
    // The best it can do on a leash β: chances ∝ old chance × e^(reward / β).
    const target = Math.exp(0 + 2) / (Math.exp(1 + 1) + Math.exp(0 + 2));
    expect(answerChances(QUESTION, leashed.likings)[1]).toBeCloseTo(target, 2);
    expect(leashed.drift).toBeLessThan(last(0).drift);
  });

  it("is the same run every time", () => {
    expect([...trainAnswers([QUESTION], { stepSize: 0.1, leash: 0.3 }, 30, 10)]).toEqual([
      ...trainAnswers([QUESTION], { stepSize: 0.1, leash: 0.3 }, 30, 10),
    ]);
  });
});
