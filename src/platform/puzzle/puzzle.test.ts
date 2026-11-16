import { dateKey, pickDaily } from "./puzzle";

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
        pickDaily(dateKey(new Date(2026, 10, day + 1)), lessons),
      ),
    );
    expect(picks.size).toBeGreaterThan(6);
  });

  it("picks a mission with its own key", () => {
    const missions = ["a", "b", "c"];
    expect(pickDaily("2026-11-16/rolling-downhill", missions)).toBe("c");
    expect(pickDaily("2026-11-16", [])).toBeUndefined();
  });

  it("uses the learner's calendar date", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
