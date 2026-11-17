import { relayClassifier, relayScore, runRelay, sigmoid } from "./boost";

// Hand-worked: two dots, group 0 at x = −0.5 and group 1 at x = 0.5.
// Base rate (1 + 0.5) / (2 + 1) = 0.5 → base score 0. Both chances 0.5.
// First runner, depth 1: pulls −0.5 and +0.5, sureness 0.25 each.
// Split at x = 0: each box has G = ±0.5, H = 0.25, nudge = ±0.5 / 1.25 = ±0.4.
// Pushing at rate 1, scores become −0.4 and +0.4.
const TWO = [
  { x: -0.5, y: 0, label: 0 },
  { x: 0.5, y: 0, label: 1 },
];

describe("runRelay", () => {
  it("the first runner nudges each side by the hand-worked amount", () => {
    const relay = runRelay(TWO, { runners: 1, depth: 1, rate: 1 });
    expect(relay.base).toBeCloseTo(0);
    expect(relayScore(relay, -0.5, 0)).toBeCloseTo(-0.4);
    expect(relayScore(relay, 0.5, 0)).toBeCloseTo(0.4);
  });

  it("the second runner chases what is still wrong", () => {
    // After runner one: chances σ(∓0.4) = 0.4013 / 0.5987. Pull ±0.4013, sureness 0.2403.
    const relay = runRelay(TWO, { runners: 2, depth: 1, rate: 1 });
    const pull = 1 - sigmoid(0.4);
    const sureness = sigmoid(0.4) * (1 - sigmoid(0.4));
    expect(relayScore(relay, 0.5, 0)).toBeCloseTo(0.4 + pull / (sureness + 1));
    expect(relayScore(relay, 0.5, 0, 1)).toBeCloseTo(0.4);
  });

  it("a softer push moves less", () => {
    const relay = runRelay(TWO, { runners: 1, depth: 1, rate: 0.5 });
    expect(relayScore(relay, 0.5, 0)).toBeCloseTo(0.2);
    expect(relayClassifier(relay)(0.5, 0)[1]).toBeCloseTo(sigmoid(0.2));
  });

  it("is the same every time", () => {
    const dots = [...TWO, { x: 0.1, y: 0.7, label: 0 }, { x: -0.3, y: -0.6, label: 1 }];
    const options = { runners: 5, depth: 2, rate: 0.7 };
    expect(runRelay(dots, options)).toEqual(runRelay(dots, options));
  });
});
