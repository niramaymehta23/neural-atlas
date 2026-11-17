import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  baseDots,
  bestLine,
  isFinished,
  meanMiss,
  walkRun,
  type LineFrame,
  type LineState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as LineState;
const CRAZY_DOT = { x: 0.9, y: -0.95 };
const at = (change: Partial<LineState>): LineState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: LineState) => [...walkRun(state)].at(-1) as LineFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `line-${(lessons += 1)}` }} module={definition} />,
  );

describe("drawing the best line: the walk", () => {
  it("walks from the learner's line to the best line", () => {
    const state = at({});
    const frames = [...walkRun(state)];
    const best = bestLine(baseDots(state));
    expect(frames[0]).toMatchObject({ left: initial.line.left, right: initial.line.right });
    expect(frames.at(-1)?.left).toBeCloseTo(best?.left ?? NaN, 2);
    expect(frames.at(-1)?.right).toBeCloseTo(best?.right ?? NaN, 2);
    expect(frames.at(-1)?.loss).toBeLessThan(meanMiss(baseDots(state), initial.line));
  });

  it("is the same walk every time, and belongs only to its own dots and line", () => {
    const state = at({});
    expect([...walkRun(state)]).toEqual([...walkRun(state)]);
    expect(isFinished(state, lastOf(state))).toBe(true);
    expect(isFinished({ ...state, line: { left: 0, right: 0 } }, lastOf(state))).toBe(false);
  });
});

describe("drawing the best line: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when one crazy dot tilts the best line", () => {
    const state = at({ added: [CRAZY_DOT] });
    expect(mission.when(state, lastOf(state))).toBe(true);
    expect(guess.answer(state, lastOf(state))).toBe("tilt");
  });

  it("does not fire for a dot that sits near the line, or before the walk ends", () => {
    const near = at({ added: [{ x: 0.5, y: 0.2 }] });
    expect(mission.when(near, lastOf(near))).toBe(false);
    expect(guess.answer(near, lastOf(near))).toBeNull();
    const crazy = at({ added: [CRAZY_DOT] });
    expect(mission.when(crazy, [...walkRun(crazy)][3])).toBe(false);
  });
});

describe("drawing the best line: links and words", () => {
  it("keeps a hand-made link sane", () => {
    const safe = definition.parseState!(
      {
        ...initial,
        line: { left: 9, right: Number.NaN },
        added: Array.from({ length: 40 }, () => ({ x: 3, y: -3 })),
        spread: 2,
        dots: -1,
        runs: 1e12,
      } as LineState,
      initial,
    ) as LineState;
    expect(safe.line).toEqual({ left: 1, right: 0 });
    expect(safe.added).toHaveLength(12);
    expect(safe.added[0]).toEqual({ x: 1, y: -1 });
    expect([safe.spread, safe.dots, safe.runs]).toEqual([1, 0, 10_000]);
  });

  it("describes the learner's line and the best line", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/^Your line misses the dots/);
    const state = at({ added: [CRAZY_DOT] });
    expect(definition.describe?.(state, lastOf(state))).toMatch(/You added one dot\.$/);
  });
});

describe("drawing the best line: in the lesson", () => {
  it("moves an end of the line with the arrow keys", async () => {
    renderLesson();
    const left = screen.getByRole("slider", { name: words.handles.left });
    act(() => left.focus());
    fireEvent.keyDown(left, { key: "ArrowUp" });
    expect(left).toHaveAttribute("aria-valuenow", "0.52");
  });

  it("earns the star once a crazy dot tilts the best line", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const field = screen.getByRole("application", { name: words.field });
    act(() => field.focus());
    // The keyboard ring starts in the middle: move it to the bottom right corner and add a dot.
    for (let step = 0; step < 18; step += 1) {
      fireEvent.keyDown(field, { key: "ArrowRight" });
      fireEvent.keyDown(field, { key: "ArrowDown" });
    }
    fireEvent.keyDown(field, { key: "Enter" });
    await userEvent.click(screen.getByRole("button", { name: words.find }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});
