import { tileTone, valueTone } from "./encodings";

describe("encodings added for the scoring board", () => {
  it("keeps treats and walls out of the value tints", () => {
    expect(tileTone("coin")).toContain("var(--color-sand)");
    expect(tileTone("coin")).not.toContain("var(--color-good)");
    expect(tileTone("wall")).toContain("var(--color-card)");
  });

  it("tints a square by how good it is to stand on", () => {
    expect(valueTone(0)).toBe("color-mix(in oklab, var(--color-good) 0%, var(--color-card))");
    expect(valueTone(1)).toBe("color-mix(in oklab, var(--color-good) 55%, var(--color-card))");
    expect(valueTone(-2)).toBe("color-mix(in oklab, var(--color-bad) 55%, var(--color-card))");
    expect(valueTone(Number.NaN)).toBe(valueTone(0));
  });
});
