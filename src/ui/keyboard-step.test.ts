import { snapToStep, valueForKey } from "./keyboard-step";

const RANGE = { min: 0, max: 1, step: 0.01 };

describe("valueForKey", () => {
  it("lands exactly on a step", () => {
    expect(valueForKey("ArrowRight", 0.1, RANGE)).toBe(0.11);
    expect(valueForKey("PageDown", 0.35, RANGE)).toBe(0.25);
  });

  it("stays inside the range and ignores other keys", () => {
    expect(valueForKey("ArrowUp", 1, RANGE)).toBe(1);
    expect(valueForKey("Home", 0.4, RANGE)).toBe(0);
    expect(valueForKey("a", 0.4, RANGE)).toBeNull();
  });
});

describe("snapToStep", () => {
  it("snaps a dragged value to the nearest step from the minimum", () => {
    expect(snapToStep(7.3, { min: 5, max: 95, step: 5 })).toBe(5);
    expect(snapToStep(0.123456, RANGE)).toBe(0.12);
  });
});
