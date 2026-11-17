import { classMark, markPath, tileMark, valueMark, weightDash } from "./encodings";

describe("encodings that read without colour", () => {
  it("gives every special square its own glyph and plain floor none", () => {
    expect(tileMark("floor")).toBeNull();
    const names = (["wall", "goal", "trap", "coin"] as const).map((kind) => tileMark(kind)?.name);
    expect(new Set(names).size).toBe(4);
    expect(tileMark("goal")?.path).toMatch(/^M/);
    // Bricks are level and upright lines only, never a slant that reads as an arrow.
    expect(tileMark("wall")?.path).not.toMatch(/L/);
  });

  it("marks good squares with a plus and bad ones with a minus", () => {
    expect(valueMark(0.5)?.sign).toBe("plus");
    expect(valueMark(-0.5)?.sign).toBe("minus");
    expect(valueMark(0.02)).toBeNull();
    expect(valueMark(Number.NaN)).toBeNull();
  });

  it("gives each group its own shape", () => {
    expect([0, 1, 2].map(classMark)).toEqual(["circle", "triangle", "square"]);
    expect(classMark(3)).toBe("circle");
    expect(markPath("triangle", 10, 10, 2)).not.toBe(markPath("square", 10, 10, 2));
  });

  it("dashes negative weights only", () => {
    expect(weightDash(0.4, 2)).toBeUndefined();
    expect(weightDash(-0.4, 2)).toBe("6 5");
  });
});
