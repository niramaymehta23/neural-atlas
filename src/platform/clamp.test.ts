import { capList, clampNumber, clampWhole, oneOf } from "./clamp";

describe("parseState guards", () => {
  it("clamps numbers and whole numbers to a range", () => {
    expect(clampNumber(100000, 0, 1)).toBe(1);
    expect(clampWhole(3.6, 1, 4)).toBe(4);
    expect(clampWhole(-2, 1, 4)).toBe(1);
  });

  it("keeps a known option or falls back", () => {
    expect(oneOf("ring", ["blobs", "ring"], "blobs")).toBe("ring");
    expect(oneOf("moon", ["blobs", "ring"], "blobs")).toBe("blobs");
  });

  it("caps a list and drops malformed items", () => {
    const isNumber = (item: unknown): item is number => typeof item === "number";
    expect(capList([1, "x", 2, 3], 2, isNumber)).toEqual([1, 2]);
  });
});
