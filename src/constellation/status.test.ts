import { BEAD_GROW } from "./bead";
import { beadScale } from "./StarMark";
import { starName, starStatus } from "./status";

describe("star status", () => {
  it("says learned, next or still being drawn, learned first", () => {
    expect(starStatus({ learned: true, suggested: false, built: true })).toBe("learned");
    expect(starStatus({ learned: false, suggested: true, built: true })).toBe("next");
    expect(starStatus({ learned: false, suggested: false, built: false })).toBe("locked");
    expect(starStatus({ learned: false, suggested: false, built: true })).toBeNull();
  });

  it("speaks the status with the name", () => {
    expect(starName("Rolling downhill", "learned")).toBe("Rolling downhill, You have learned this");
    expect(starName("Rolling downhill", "next")).toBe("Rolling downhill, A good one to try next");
    expect(starName("Teach by showing", "locked")).toBe("Teach by showing, Still being drawn");
    expect(starName("Rolling downhill", null)).toBe("Rolling downhill");
  });
});

describe("bead size", () => {
  it("swells while its label is shown", () => {
    expect(beadScale(true)).toBe(BEAD_GROW);
    expect(beadScale(true)).toBeGreaterThan(1);
    expect(beadScale(false)).toBe(1);
  });
});
