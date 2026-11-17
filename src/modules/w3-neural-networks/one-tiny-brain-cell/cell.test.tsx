import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { INITIAL, MIXES, neverYes, sayYes, score, type CellState } from "./model";
import { predictions } from "./predictions";

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `one-tiny-brain-cell-${(lessons += 1)}` }}
      module={definition}
    />,
  );
const at = (change: Partial<CellState>): CellState => ({ ...INITIAL, changes: 1, ...change });

describe("one tiny brain cell: the maths", () => {
  it("lists every mix of three voices once", () => {
    expect(new Set(MIXES.map((mix) => mix.join(""))).size).toBe(8);
  });

  it("says yes when the trusted voices beat how hard it is to convince", () => {
    expect(sayYes(INITIAL, [1, 1, 1])).toBeGreaterThan(0.5);
    expect(sayYes(INITIAL, [0, 0, 0])).toBeLessThan(0.5);
    // Firmer cells are surer about the same total.
    const soft = sayYes({ ...INITIAL, firmness: 0 }, [1, 1, 1]);
    const firm = sayYes({ ...INITIAL, firmness: 1 }, [1, 1, 1]);
    expect(firm).toBeGreaterThan(soft);
  });
});

describe("one tiny brain cell: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when no mix of voices gets a yes", () => {
    expect(mission.when(at({ weights: [-1, -1, -1] }))).toBe(true);
    expect(mission.when(at({ convince: 1 }))).toBe(true);
    expect(mission.when(at({}))).toBe(false);
    // One voice it trusts hugely still gets a yes on sunny days.
    expect(neverYes(at({ weights: [3, -3, -3], convince: 0.6 }))).toBe(false);
  });

  it("does not fire before the learner has changed anything", () => {
    expect(mission.when({ ...INITIAL, weights: [-1, -1, -1] })).toBe(false);
  });

  it("answers about the cell as it first appears, whatever the learner's cell is", () => {
    expect(guess.answer(INITIAL)).toBeNull();
    expect(score(INITIAL, [0, 1, 1])).toBeLessThan(0);
    expect(guess.answer(at({}))).toBe("no");
    expect(guess.answer(at({ weights: [0, 3, 3] }))).toBe("no");
  });
});

describe("one tiny brain cell: links and words", () => {
  it("keeps a hand-made link's numbers on their strings and dials", () => {
    const saved = {
      weights: [99, "x", -99, 4],
      voices: [1, 7, 0],
      convince: 4,
      firmness: -1,
      changes: -5,
    } as unknown as CellState;
    const safe = definition.parseState!(saved, INITIAL) as CellState;
    expect(safe.weights).toEqual([3, 0, -3]);
    expect(safe.voices).toEqual([1, 0, 0]);
    expect(safe.convince).toBe(1);
    expect(safe.firmness).toBe(0);
    expect(safe.changes).toBe(0);
  });

  it("describes what the cell says and who is saying yes", () => {
    expect(definition.describe?.(INITIAL, undefined)).toMatch(
      /says go.*it’s sunny, it’s the weekend/,
    );
    expect(definition.describe?.(at({ voices: [0, 0, 0] }), undefined)).toMatch(
      /stay home.*nobody/,
    );
  });
});

describe("one tiny brain cell: in the lesson", () => {
  it("switches a voice off with a tap and changes the day it is on", async () => {
    renderLesson();
    const sun = screen.getByRole("button", { name: words.strings.voice(words.voices.sun, true) });
    await userEvent.click(sun);
    expect(
      screen.getByRole("button", { name: words.strings.voice(words.voices.sun, false) }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/The cell says: Let’s stay home/)).toBeInTheDocument();
  });

  it("pulls a string with the keyboard", async () => {
    renderLesson();
    const string = screen.getByRole("slider", { name: words.strings.string(words.voices.weekend) });
    string.focus();
    await userEvent.keyboard("{End}");
    expect(string).toHaveAttribute("aria-valuetext", "trusts it a lot");
  });

  it("earns the star once it is too hard to convince on any day", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.convince.label }).focus();
    await userEvent.keyboard("{End}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    expect(document.querySelectorAll("[data-goes=true]")).toHaveLength(0);
  });
});
