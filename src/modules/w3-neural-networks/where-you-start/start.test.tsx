import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  allCopies,
  isFinished,
  recentSpins,
  ROUNDS,
  spinEnd,
  spinRun,
  startFor,
  stripFor,
  keyOf,
  type StartFrame,
  type StartState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as StartState;
const at = (change: Partial<StartState>): StartState => ({ ...initial, spins: 1, ...change });
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `start-${(lessons += 1)}` }} module={definition} />,
  );

describe("where you start: the spins", () => {
  it("records a whole practice, the same one every time for the same spin", () => {
    const frames = Array.from(spinRun(at({})));
    expect(frames.at(-1)?.epoch).toBe(ROUNDS);
    expect(Array.from(spinRun(at({})))).toEqual(frames);
    expect(isFinished(at({}), frames.at(-1))).toBe(true);
    expect(isFinished(at({ spins: 2 }), frames.at(-1))).toBe(false);
  });

  it("draws new starting guesses each spin, and some spins end better than others", () => {
    expect(Array.from(startFor(at({ spins: 2 })))).not.toEqual(Array.from(startFor(at({}))));
    const ends = [1, 2, 3, 4, 5, 6, 7, 8].map((spins) => spinEnd(at({ spins })).right);
    expect(new Set(ends).size).toBeGreaterThan(1);
  });

  it("keeps cells that start the same as copies, and lets random starts drift apart", () => {
    const same = spinEnd(at({ same: true }));
    expect(allCopies(initial.cells, same.params)).toBe(true);
    expect(allCopies(initial.cells, spinEnd(at({})).params)).toBe(false);
  });

  it("shows the last few spins, newest last", () => {
    expect(recentSpins(0)).toEqual([]);
    expect(recentSpins(2)).toEqual([1, 2]);
    expect(recentSpins(9)).toEqual([5, 6, 7, 8, 9]);
    expect(stripFor(undefined)).toEqual([]);
    const strip = stripFor(keyOf(at({ spins: 3 })));
    expect(strip.map(({ spins }) => spins)).toEqual([1, 2, 3]);
    expect(strip[2]?.right).toBe(spinEnd(at({ spins: 3 })).right);
  });
});

describe("where you start: mission and guess", () => {
  it("fires when every cell ends up the same", () => {
    const state = at({ same: true, cells: 5 });
    expect(mission.when(state, spinEnd(state))).toBe(true);
  });

  it("does not fire for random starts, or before a spin ends", () => {
    expect(mission.when(at({}), spinEnd(at({})))).toBe(false);
    const state = at({ same: true });
    expect(mission.when(state, Array.from(spinRun(state))[3])).toBe(false);
    expect(mission.when({ ...state, spins: 2 }, spinEnd(state))).toBe(false);
  });

  it("answers from a finished spin that started every cell the same", () => {
    const state = at({ same: true });
    expect(guess.answer(state, spinEnd(state))).toBe("no");
    expect(guess.answer(at({}), spinEnd(at({})))).toBeNull();
  });
});

describe("where you start: links and words", () => {
  it("keeps a hand-made link's numbers on their dials", () => {
    const saved = {
      wild: 4,
      cells: 40,
      same: "yes",
      spins: -3,
    } as unknown as StartState;
    expect(definition.parseState?.(saved, initial)).toEqual({
      wild: 1,
      cells: 6,
      same: false,
      spins: 0,
    });
  });

  it("says how the spin went", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    const state = at({ same: true });
    const end = spinEnd(state) as StartFrame;
    expect(definition.describe?.(state, end)).toContain(words.cells.copies);
    expect(definition.describe?.(state, Array.from(spinRun(state))[1])).toBe(
      words.describe.practising,
    );
  });

  it("compares this spin with the next", () => {
    expect(definition.compare?.(at({})).spins).toBe(2);
  });
});

describe("where you start: in the lesson", () => {
  it("earns the star when every cell starts the same", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("switch", { name: words.same }));
    await userEvent.click(screen.getByRole("button", { name: words.spin }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(
      () => expect(document.querySelector("[data-copies]")).toHaveTextContent(words.cells.copies),
      { timeout: 5000 },
    );
  });
});
