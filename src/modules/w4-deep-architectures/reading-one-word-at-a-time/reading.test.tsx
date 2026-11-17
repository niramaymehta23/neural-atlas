import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { isFinished, readingRun, type ReadingFrame, type ReadingState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as ReadingState;
const at = (change: Partial<ReadingState>): ReadingState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: ReadingState) => [...readingRun(state)].at(-1) as ReadingFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `reading-one-word-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("reading one word at a time: the run", () => {
  it("remembers short sentences and forgets long ones", () => {
    expect(lastOf(at({ length: 6 })).right).toBeGreaterThan(0.9);
    expect(lastOf(at({ length: 16 })).right).toBeLessThan(0.65);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...readingRun(at({ length: 9, step: 0.7 }))]).toEqual([
      ...readingRun(at({ length: 9, step: 0.7 })),
    ]);
  });

  it("keeps runs short enough to play in a few seconds", () => {
    expect([...readingRun(at({ length: 20 }))].length).toBeLessThanOrEqual(61);
  });
});

describe("reading one word at a time: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires once practice on long sentences ends in guessing, at every step size", () => {
    for (const step of [0, 1]) {
      const long = at({ length: 12, step });
      expect(mission.when(long, lastOf(long))).toBe(true);
    }
  });

  it("does not fire for short sentences or a run still going", () => {
    const short = at({ length: 11 });
    expect(mission.when(short, lastOf(short))).toBe(false);
    const long = at({ length: 16 });
    expect(mission.when(long, [...readingRun(long)][1])).toBe(false);
  });

  it("answers the long-sentence question only from a finished long run", () => {
    const long = at({ length: 16 });
    expect(guess.answer(long, lastOf(long))).toBe("no");
    expect(guess.answer(at({}), lastOf(at({})))).toBeNull();
    expect(guess.answer(long, undefined)).toBeNull();
  });
});

describe("reading one word at a time: links and words", () => {
  it("keeps a hand-made link on its dials and choices", () => {
    const safe = definition.parseState!(
      { length: 400, step: -2, start: "snowy", runs: 1e9 } as unknown as ReadingState,
      initial,
    ) as ReadingState;
    expect(safe).toEqual({ length: 20, step: 0, start: "sunny", runs: 10_000 });
  });

  it("describes the reader before and after practice", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/waiting for the reader/);
    const done = at({});
    const end = lastOf(done);
    expect(isFinished(done, end)).toBe(true);
    expect(definition.describe?.(done, end)).toMatch(/nearly always picks/);
  });
});

describe("reading one word at a time: in the lesson", () => {
  it("shows its answer once it has practised", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    await waitFor(() => expect(document.querySelector("[data-memory=remembers]")).not.toBeNull(), {
      timeout: 8000,
    });
    expect(document.querySelectorAll("[data-word]")).toHaveLength(6);
  });

  it("earns the star once a long sentence is forgotten", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.length.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 8000,
    });
  });
});
