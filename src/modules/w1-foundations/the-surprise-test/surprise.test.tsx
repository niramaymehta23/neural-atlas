import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  hiddenCount,
  hiddenSet,
  isFinished,
  surpriseRun,
  type SurpriseFrame,
  type SurpriseState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SurpriseState;
const at = (change: Partial<SurpriseState>): SurpriseState => ({
  ...initial,
  runs: 1,
  fresh: true,
  ...change,
});
const lastOf = (state: SurpriseState) => [...surpriseRun(state)].at(-1) as SurpriseFrame;
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `surprise-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("the surprise test: hiding", () => {
  it("hides more dots as the dial turns, always including the ones hidden before", () => {
    expect(hiddenCount(0)).toBeLessThan(hiddenCount(1));
    const few = hiddenSet(0);
    const many = hiddenSet(1);
    for (const index of few) expect(many.has(index)).toBe(true);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...surpriseRun(at({}))]).toEqual([...surpriseRun(at({}))]);
  });
});

describe("the surprise test: mission and guess", () => {
  it("fires when it peeked and the brand-new dots show the score lied", () => {
    const peeked = at({ peek: true, cells: 12 });
    expect(mission.when(peeked, lastOf(peeked))).toBe(true);
  });

  it("does not fire without peeking, or before the brand-new dots are tried", () => {
    const honest = at({ cells: 12 });
    expect(mission.when(honest, lastOf(honest))).toBe(false);
    const peeked = at({ peek: true, cells: 12, fresh: false });
    expect(mission.when(peeked, lastOf(peeked))).toBe(false);
    expect(mission.when(peeked, [...surpriseRun(peeked)][1])).toBe(false);
  });

  it("finds the surprise test closest to the brand-new score when it does not peek", () => {
    const honest = at({ cells: 12 });
    expect(guess.answer(honest, lastOf(honest))).toBe("surprise");
    expect(guess.answer(at({ peek: true }), lastOf(at({ peek: true })))).toBeNull();
    expect(guess.answer({ ...honest, fresh: false }, lastOf(honest))).toBeNull();
    expect(isFinished({ ...honest, cells: 2 }, lastOf(honest))).toBe(false);
  });
});

describe("the surprise test: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { hide: 7, cells: 0.2, peek: "yes", fresh: 1, runs: -5 } as unknown as SurpriseState,
      initial,
    );
    expect(safe).toEqual({ hide: 1, cells: 1, peek: false, fresh: false, runs: 0 });
  });

  it("describes the dots before and after practice", () => {
    expect(definition.describe?.({ ...initial }, undefined)).toBe(words.describe.waiting);
    const state = at({});
    expect(definition.describe?.(state, lastOf(state))).toMatch(/surprise-test dots right/);
  });
});

describe("the surprise test: in the lesson", () => {
  it("earns the star once a peeking learner's surprise score is shown to lie", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const cells = screen.getByRole("slider", { name: words.cells.label });
    cells.focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("switch", { name: words.peek }));
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    await waitFor(() => expect(screen.getByRole("button", { name: words.tryFresh })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: words.tryFresh }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });
});
