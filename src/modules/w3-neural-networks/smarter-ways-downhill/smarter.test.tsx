import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { STEPS } from "@/features/building/race/race";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  carefulLost,
  isFinished,
  jitterFor,
  race,
  result,
  type SmarterFrame,
  type SmarterState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as SmarterState;
const at = (change: Partial<SmarterState>): SmarterState => ({ ...initial, runs: 1, ...change });
const endOf = (state: SmarterState) => race(state).at(-1) as SmarterFrame;
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `smarter-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("smarter ways downhill: the race", () => {
  it("records every step, the same race every time", () => {
    const frames = race(at({}));
    expect(frames).toHaveLength(STEPS + 1);
    expect(race(at({}))).toEqual(frames);
    expect(isFinished(at({}), frames.at(-1))).toBe(true);
    expect(isFinished(at({ step: 0.5 }), frames.at(-1))).toBe(false);
  });

  it("feels a wobbly slope with few examples and a smooth one with all of them", () => {
    expect(jitterFor(1)).toBe(0);
    expect(jitterFor(0)).toBeGreaterThan(jitterFor(0.5));
    const smooth = race(at({}));
    const wobbly = race(at({ examples: 0 }));
    expect(wobbly.at(-1)?.walkers).not.toEqual(smooth.at(-1)?.walkers);
  });

  it("names who ended lowest, or says they ended level", () => {
    expect(result("bowl", endOf(at({})))).toEqual({ level: true });
    const pass = at({ valley: "pass", step: 1 });
    expect(result("pass", endOf(pass))).toMatchObject({ level: false, last: "adam" });
  });
});

describe("smarter ways downhill: mission and guess", () => {
  it("fires when huge steps make the careful stepper hop over the dip", () => {
    const pass = at({ valley: "pass", step: 1 });
    expect(carefulLost("pass", endOf(pass))).toBe(true);
    expect(mission.when(pass, endOf(pass))).toBe(true);
  });

  it("does not fire for the gentle race it opens on, or before a race ends", () => {
    const gentle = at({});
    expect(mission.when(gentle, endOf(gentle))).toBe(false);
    const pass = at({ valley: "pass", step: 1 });
    expect(mission.when(pass, race(pass)[10])).toBe(false);
    expect(mission.when({ ...pass, step: 0.1 }, endOf(pass))).toBe(false);
  });

  it("answers the ravine question from a finished ravine race only", () => {
    const ravine = at({ valley: "ravine" });
    expect(guess.answer(ravine, endOf(ravine))).toBe("sgd");
    expect(guess.answer(at({}), endOf(at({})))).toBeNull();
    expect(guess.answer(ravine, race(ravine)[5])).toBeNull();
  });
});

describe("smarter ways downhill: links and words", () => {
  it("keeps a hand-made link's numbers on their dials", () => {
    const saved = {
      valley: "moon",
      step: 7,
      examples: -2,
      start: { x: 9, z: Number.NaN },
      runs: 1e12,
    } as unknown as SmarterState;
    expect(definition.parseState?.(saved, initial)).toEqual({
      valley: "bowl",
      step: 1,
      examples: 0,
      start: { x: 1, z: 0 },
      runs: 10_000,
    });
  });

  it("puts a link with no start back at the middle of the ground", () => {
    const saved = { ...initial, start: undefined } as unknown as SmarterState;
    expect(definition.parseState?.(saved, initial).start).toEqual({ x: 0, z: 0 });
  });

  it("says what the walkers did", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), endOf(at({})))).toBe(words.describe.level);
    const pass = at({ valley: "pass", step: 1 });
    expect(definition.describe?.(pass, endOf(pass))).toMatch(/careful stepper came last/);
  });
});

describe("smarter ways downhill: in the lesson", () => {
  it("earns the star with huge steps on the mountain pass", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("radio", { name: words.valley.pass }));
    screen.getByRole("slider", { name: words.step.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.race }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(
      () => expect(document.querySelector("[data-race-result]")).toHaveTextContent(/came last/),
      { timeout: 5000 },
    );
  });
});
