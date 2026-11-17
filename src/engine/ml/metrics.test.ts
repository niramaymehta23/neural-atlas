import { accuracy, areaUnder, caughtShare, confusion, rocCurve, trustShare } from "./metrics";

// Hand-worked: scores 0.9 (sick), 0.8 (well), 0.6 (sick), 0.3 (well), 0.1 (well).
const SCORES = [0.9, 0.8, 0.6, 0.3, 0.1];
const SICK = [true, false, true, false, false];

describe("scores", () => {
  it("sorts into the four boxes at a threshold", () => {
    // At 0.7: says yes to 0.9 (caught) and 0.8 (false alarm); no to 0.6 (missed), 0.3, 0.1 (clear).
    const counts = confusion(SCORES, SICK, 0.7);
    expect(counts).toEqual({ caught: 1, falseAlarm: 1, clear: 2, missed: 1 });
    expect(accuracy(counts)).toBeCloseTo(3 / 5);
    expect(caughtShare(counts)).toBeCloseTo(1 / 2);
    expect(trustShare(counts)).toBeCloseTo(1 / 2);
  });

  it("saying no to everyone is right as often as the healthy are common", () => {
    const counts = confusion(SCORES, SICK, 2);
    expect(accuracy(counts)).toBeCloseTo(3 / 5);
    expect(caughtShare(counts)).toBe(0);
  });

  it("the ROC curve and its area match the hand-worked ones", () => {
    const curve = rocCurve(SCORES, SICK);
    expect(curve.map(({ falseAlarms, caught }) => [falseAlarms, caught])).toEqual([
      [0, 0],
      [0, 0.5],
      [1 / 3, 0.5],
      [1 / 3, 1],
      [2 / 3, 1],
      [1, 1],
    ]);
    // Area: 1/3 × 0.5 + 2/3 × 1 = 5/6.
    expect(areaUnder(curve)).toBeCloseTo(5 / 6);
  });

  it("a perfect sorter has area 1", () => {
    expect(areaUnder(rocCurve([0.9, 0.8, 0.2], [true, true, false]))).toBeCloseTo(1);
  });
});
