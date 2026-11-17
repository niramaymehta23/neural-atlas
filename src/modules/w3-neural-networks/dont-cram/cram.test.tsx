import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  cramEnd,
  cramRun,
  FIXED,
  freshShare,
  isFinished,
  learnedNothing,
  offCells,
  practiceShare,
  ROUNDS,
  switchingHelps,
  type CramState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as CramState;
const at = (change: Partial<CramState>): CramState => ({ ...initial, runs: 1, ...change });
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `cram-${(lessons += 1)}` }} module={definition} />,
  );

describe("don't cram: the practice", () => {
  it("records a whole practice, the same one every time", () => {
    const frames = Array.from(cramRun(at({})));
    expect(frames.at(-1)?.epoch).toBe(ROUNDS);
    expect(Array.from(cramRun(at({})))).toEqual(frames);
    expect(isFinished(at({}), frames.at(-1))).toBe(true);
    expect(isFinished(at({ off: 0.5 }), frames.at(-1))).toBe(false);
  });

  it("learns every practice dot by heart with nobody off, and does better on new dots with some off", () => {
    const cram = cramEnd(at({}));
    expect(practiceShare(cram)).toBe(1);
    const some = cramEnd(at({ off: FIXED.with }));
    expect(freshShare(some)).toBeGreaterThan(freshShare(cram));
    expect(switchingHelps()).toBe(true);
  });

  it("switches off about the dial's share of cells in a moment of practice", () => {
    expect(offCells({ off: 0, team: 16 }, 3).some(Boolean)).toBe(false);
    expect(offCells({ off: 0.5, team: 32 }, 3).filter(Boolean).length).toBeGreaterThan(4);
    expect(offCells({ off: 0.5, team: 32 }, 3)).toEqual(offCells({ off: 0.5, team: 32 }, 3));
  });
});

describe("don't cram: mission and guess", () => {
  it("fires when nearly every cell is off and it learns nothing", () => {
    const state = at({ off: 1 });
    expect(learnedNothing(cramEnd(state))).toBe(true);
    expect(mission.when(state, cramEnd(state))).toBe(true);
  });

  it("does not fire with a sensible share off, or before the practice ends", () => {
    expect(mission.when(at({}), cramEnd(at({})))).toBe(false);
    expect(mission.when(at({ off: 0.4 }), cramEnd(at({ off: 0.4 })))).toBe(false);
    const state = at({ off: 1 });
    expect(mission.when(state, Array.from(cramRun(state))[5])).toBe(false);
  });

  it("answers from the fixed comparison once a run with cells off has finished", () => {
    const state = at({ off: 0.7 });
    expect(guess.answer(state, cramEnd(state))).toBe("yes");
    expect(guess.answer(at({ off: 1 }), cramEnd(at({ off: 1 })))).toBe("yes");
    expect(guess.answer(at({}), cramEnd(at({})))).toBeNull();
  });
});

describe("don't cram: links and words", () => {
  it("keeps a hand-made link's numbers on their dials", () => {
    const saved = { off: 3, team: 13, runs: Number.NaN } as unknown as CramState;
    expect(definition.parseState?.(saved, initial)).toEqual({ off: 1, team: 12, runs: 0 });
    const low = { off: -1, team: -40, runs: 2 } as unknown as CramState;
    expect(definition.parseState?.(low, initial)).toEqual({ off: 0, team: 4, runs: 2 });
  });

  it("says both scores once the practice is done", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), cramEnd(at({})))).toMatch(
      /^Practice dots: 20 out of 20 right\. New dots: \d+ out of 100 right\.$/,
    );
  });

  it("compares with no cells switched off", () => {
    expect(definition.compare?.(at({ off: 0.6 })).off).toBe(0);
  });
});

describe("don't cram: in the lesson", () => {
  it("earns the star when nearly every cell is switched off", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.off.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
    await waitFor(() =>
      expect(document.querySelector("[data-scores]")).toHaveTextContent(/New dots/),
    );
  });
});
