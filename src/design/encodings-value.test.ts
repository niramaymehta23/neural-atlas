import { tileTone, valueTone } from "./encodings";

describe("encodings added for the scoring board", () => {
  it("gives a treat square a little of the goal's goodness", () => {
    expect(tileTone("coin")).toContain("var(--color-good)");
  });

  it("tints a square by how good it is to stand on", () => {
    expect(valueTone(0)).toBe("color-mix(in oklab, var(--color-good) 0%, var(--color-card))");
    expect(valueTone(1)).toBe("color-mix(in oklab, var(--color-good) 55%, var(--color-card))");
    expect(valueTone(-2)).toBe("color-mix(in oklab, var(--color-bad) 55%, var(--color-card))");
    expect(valueTone(Number.NaN)).toBe(valueTone(0));
  });
});
