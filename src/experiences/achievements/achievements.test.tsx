import { act, render, screen, waitFor } from "@testing-library/react";
import { lessons, worlds } from "@/catalog";
import { progressStore, type Progress } from "@/platform/progress/progress";
import { ComputeMeter, dotsFor, ONE_REPLY } from "../meter/ComputeMeter";
import { achievements, award, awardStore, earnedAchievements } from "./achievements";
import { AwardNote } from "./AwardNote";

const progress = (over: Partial<Progress> = {}): Progress => ({
  lessons: {},
  achievements: [],
  ...over,
});
const done = { visited: true, missions: ["m"], predicted: true };

describe("achievements", () => {
  it("start with none, and follow from the lessons or from what was recorded", () => {
    expect([...earnedAchievements(progress())]).toEqual([]);
    const some = Object.fromEntries(lessons.slice(0, 10).map(({ id }) => [id, done]));
    const earned = earnedAchievements(
      progress({ lessons: some, achievements: ["race", "made-up"] }),
    );
    expect(earned.has("first-star")).toBe(true);
    expect(earned.has("ten-stars")).toBe(true);
    expect(earned.has("race")).toBe(true);
    expect(earned.has("made-up")).toBe(false);
    for (const { world } of worlds)
      expect(earned.has(`world-${world}`)).toBe(
        lessons.filter((lesson) => lesson.world === world).every(({ id }) => id in some),
      );
  });

  it("give every world its star once all of it is learned", () => {
    const all = Object.fromEntries(lessons.map(({ id }) => [id, done]));
    const earned = earnedAchievements(progress({ lessons: all }));
    for (const { world } of worlds) expect(earned.has(`world-${world}`)).toBe(true);
  });

  it("are distinct, each with a place to go", () => {
    expect(new Set(achievements.map(({ id }) => id)).size).toBe(achievements.length);
    for (const { href, title, how } of achievements) {
      expect(href).toMatch(/^\//);
      expect(title && how).toBeTruthy();
    }
  });

  it("are announced once, the first time", async () => {
    render(<AwardNote />);
    await act(() => award("mend"));
    // It fades in from nothing, so wait for it to show, not only to be on the page.
    await waitFor(
      () => expect(screen.getByText("You earned a star: Breaker and fixer.")).toBeVisible(),
      { timeout: 10_000 },
    );
    expect(progressStore.getState().achievements).toContain("mend");
    act(() => awardStore.setState({ latest: null }));
    await act(() => award("mend"));
    expect(awardStore.getState().latest).toBeNull();
    expect(progressStore.getState().achievements.filter((id) => id === "mend")).toHaveLength(1);
  }, 15_000);
});

describe("the compute meter", () => {
  it("grows a dot for each ten times, up to its end", () => {
    expect([0, 1, 10, 999, 1000, 1e30].map(dotsFor)).toEqual([0, 1, 2, 3, 4, 15]);
  });

  it("says how it compares with one chatbot reply", () => {
    const { rerender } = render(<ComputeMeter times={0} />);
    expect(screen.getByText("No multiplying yet.")).toBeVisible();
    rerender(<ComputeMeter times={1e6} />);
    expect(screen.getByText(/17.5 million runs|million runs/)).toBeVisible();
    rerender(<ComputeMeter times={ONE_REPLY} />);
    expect(screen.getByText(/about as many as a short reply/)).toBeVisible();
    rerender(<ComputeMeter times={0} started perAnswer={400} />);
    expect(screen.getByText(/only remembered/)).toBeVisible();
  });
});
