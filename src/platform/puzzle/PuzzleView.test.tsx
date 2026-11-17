import { act, render, screen } from "@testing-library/react";
import type { Lesson, LessonModule } from "../contract";
import { valleyModule } from "../fixture/fixture-module";
import { progressStore } from "../progress/progress";
import { PuzzleView } from "./PuzzleView";

const missions = ["one", "two", "three", "four", "five", "six"].map((id) => ({
  ...valleyModule.missions[0],
  id,
  goal: `Goal ${id}`,
}));
const definition = { ...valleyModule, missions } as unknown as LessonModule;
const lesson: Lesson = {
  id: "puzzle-lesson",
  world: 1,
  title: "A puzzle lesson",
  realTerm: "term",
  idea: "idea",
  playWith: "play",
  prerequisites: [],
  load: async () => definition,
};

const goalShown = () => screen.getByRole("region", { name: "Mission" }).textContent ?? "";

describe("PuzzleView (PLT-23)", () => {
  afterEach(() => vi.useRealTimers());

  it("says when today's puzzle is already solved", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T10:00:00Z"));
    render(<PuzzleView lessons={[lesson]} />);
    const goal = await screen.findByText(/^Goal /);
    const id = goal.textContent?.replace("Goal ", "") ?? "";
    await act(() => progressStore.recordMission(lesson.id, id));
    expect(await screen.findByText("Solved today. A new one arrives tomorrow.")).toBeVisible();
    expect(screen.getByText("Mission done")).toBeVisible();
  });

  it("moves to the next day's pick at UTC midnight", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-17T23:59:30Z"));
    render(<PuzzleView lessons={[lesson]} />);
    await screen.findByText(/^Goal /);
    const before = screen.getByText(/The puzzle for/).textContent;
    await act(() => vi.advanceTimersByTimeAsync(40_000));
    await vi.waitFor(() => expect(screen.getByText(/The puzzle for/).textContent).not.toBe(before));
    expect(goalShown()).toMatch(/Goal /);
  });
});
