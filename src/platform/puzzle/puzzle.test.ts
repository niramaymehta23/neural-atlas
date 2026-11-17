import { dateKey, pickDaily, untilNextPuzzle } from "./puzzle";

const lessons = Array.from({ length: 12 }, (_, index) => `lesson-${index}`);

describe("daily puzzle", () => {
  it("gives the same pick for the same date, whatever was picked before", () => {
    const first = pickDaily("2026-11-16", lessons);
    pickDaily("2026-11-17", lessons);
    expect(pickDaily("2026-11-16", [...lessons])).toBe(first);
    // Pinned: a change here would give learners on the same date different puzzles.
    expect(first).toBe("lesson-4");
  });

  it("rotates across the choices over a month", () => {
    const picks = new Set(
      Array.from({ length: 30 }, (_, day) =>
        pickDaily(dateKey(new Date(Date.UTC(2026, 10, day + 1))), lessons),
      ),
    );
    expect(picks.size).toBeGreaterThan(6);
  });

  it("picks a mission with its own key", () => {
    const missions = ["a", "b", "c"];
    expect(pickDaily("2026-11-16/rolling-downhill", missions)).toBe("c");
    expect(pickDaily("2026-11-16", [])).toBeUndefined();
  });

  it("picks the same puzzle in every time zone at one moment (NAV-27)", () => {
    const moment = Date.parse("2026-01-05T23:59:00Z");
    expect(dateKey(new Date(moment))).toBe("2026-01-05");
    // The same instant written with two offsets.
    expect(dateKey(new Date("2026-01-05T15:59:00-08:00"))).toBe("2026-01-05");
    expect(dateKey(new Date("2026-01-06T08:59:00+09:00"))).toBe("2026-01-05");
  });

  it("knows when the next puzzle arrives", () => {
    expect(untilNextPuzzle(new Date("2026-01-05T23:59:00Z"))).toBe(60_000);
  });
});
