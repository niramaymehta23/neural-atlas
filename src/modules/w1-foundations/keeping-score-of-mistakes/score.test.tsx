import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  cost,
  dotsFor,
  ignoresRare,
  isFinished,
  scoreRun,
  type ScoreFrame,
  type ScoreState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as ScoreState;
const at = (change: Partial<ScoreState>): ScoreState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: ScoreState) => [...scoreRun(state)].at(-1) as ScoreFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `score-${(lessons += 1)}` }} module={definition} />,
  );

describe("keeping score of mistakes: the scorer", () => {
  it("makes a big miss cost hugely more under a strict scorer", () => {
    expect(cost(0.9, 4) / cost(0.9, 1)).toBeGreaterThan(20);
    expect(cost(0.05, 4)).toBeLessThan(cost(0.05, 1));
  });

  it("adds the rare group a dot at a time, and walks the same way every time", () => {
    expect(dotsFor({ rare: 0 }).filter((dot) => dot.rare)).toHaveLength(0);
    expect(dotsFor({ rare: 1 }).filter((dot) => dot.rare)).toHaveLength(6);
    const state = at({});
    expect([...scoreRun(state)]).toEqual([...scoreRun(state)]);
    const frames = [...scoreRun(state)];
    expect(frames.at(-1)?.loss).toBeLessThan(frames[0]?.loss ?? 0);
    expect(isFinished(state, frames.at(-1))).toBe(true);
    expect(isFinished({ ...state, strict: 0 }, frames.at(-1))).toBe(false);
  });

  it("is dragged by the rare group when strict, and ignores it when gentle", () => {
    const strict = at({ strict: 1 });
    expect(ignoresRare(strict, lastOf(strict))).toBe(false);
    const gentle = at({ strict: 0 });
    expect(ignoresRare(gentle, lastOf(gentle))).toBe(true);
  });
});

describe("keeping score of mistakes: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires for a gentle scorer that leaves the rare group alone", () => {
    const gentle = at({ strict: 0 });
    expect(mission.when(gentle, lastOf(gentle))).toBe(true);
    const strict = at({ strict: 1 });
    expect(mission.when(strict, lastOf(strict))).toBe(false);
    expect(mission.when(gentle, [...scoreRun(gentle)][2])).toBe(false);
    const empty = at({ strict: 0, rare: 0 });
    expect(mission.when(empty, lastOf(empty))).toBe(false);
  });

  it("is told by a finished strict walk: the far-off dots pull hardest", () => {
    const strict = at({ strict: 1 });
    expect(guess.answer(strict, lastOf(strict))).toBe("far");
    const gentle = at({ strict: 0 });
    expect(guess.answer(gentle, lastOf(gentle))).toBeNull();
    expect(guess.answer(strict, undefined)).toBeNull();
  });
});

describe("keeping score of mistakes: links and words", () => {
  it("keeps a hand-made link sane", () => {
    const safe = definition.parseState!(
      { strict: 7, rare: Number.NaN, runs: -4 } as ScoreState,
      initial,
    ) as ScoreState;
    expect(safe).toEqual({ strict: 1, rare: 0, runs: 0 });
  });

  it("describes the waiting line and the settled one", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/^The line is waiting to learn\./);
    const gentle = at({ strict: 0 });
    expect(definition.describe?.(gentle, lastOf(gentle))).toMatch(/left far away\.$/);
  });
});

describe("keeping score of mistakes: in the lesson", () => {
  it("earns the star once a gentle scorer lets the line ignore the rare group", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const strict = screen.getByRole("slider", { name: words.strict.label });
    act(() => strict.focus());
    fireEvent.keyDown(strict, { key: "Home" });
    await userEvent.click(screen.getByRole("button", { name: words.start }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });
});
