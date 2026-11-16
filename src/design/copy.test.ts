import { count, outOf } from "./copy";

describe("outOf", () => {
  it("words a share as a count out of a total", () => {
    expect(outOf(0.983)).toBe("98 out of 100 right");
    expect(outOf(0.5, { total: 10, noun: "tries" })).toBe("5 out of 10 tries");
    expect(outOf(0.25, { noun: "" })).toBe("25 out of 100");
  });

  it("keeps impossible shares inside the total", () => {
    expect(outOf(1.4)).toBe("100 out of 100 right");
    expect(outOf(Number.NaN)).toBe("0 out of 100 right");
  });
});

describe("count", () => {
  it("spells small numbers", () => {
    expect(count(7)).toBe("seven");
    expect(count(0)).toBe("zero");
  });

  it("rounds big numbers the way people say them", () => {
    expect(count(42)).toBe("42");
    expect(count(12_400)).toBe("about 12 thousand");
    expect(count(3_000_000)).toBe("3 million");
    expect(count(-2)).toBe("minus two");
  });
});
