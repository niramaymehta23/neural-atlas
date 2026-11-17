import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  fixedEnding,
  isFinished,
  planEnding,
  planFor,
  rollPlan,
  STEPS,
  SWEEP,
  SWEEP_ENDS,
  type PlanFrame,
  type PlanState,
} from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as PlanState;
const at = (change: Partial<PlanState>): PlanState => ({ ...initial, runs: 1, ...change });
const endOf = (state: PlanState) => rollPlan(state).at(-1) as PlanFrame;
const [mission] = missions;
const [guess] = predictions;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell lesson={{ ...valleyLesson, id: `plan-${(lessons += 1)}` }} module={definition} />,
  );

describe("big steps then small: the walk", () => {
  it("records every step, the same walk every time", () => {
    const frames = rollPlan(initial);
    expect(frames).toHaveLength(STEPS + 1);
    expect(rollPlan(initial)).toEqual(frames);
    expect(isFinished(initial, frames.at(-1))).toBe(true);
    expect(isFinished({ plan: planFor(0.9, 0) }, frames.at(-1))).toBe(false);
  });

  it("settles with the plan it opens on, and tells the other endings apart", () => {
    expect(planEnding(initial.plan)).toBe("settled");
    expect(planEnding(planFor(0.55, 0.9))).toBe("short");
    expect(fixedEnding(0.6)).toBe("bouncing");
    expect(fixedEnding(0.02)).toBe("crawling");
    expect(fixedEnding(1)).toBe("off");
  });

  it("sweeps every fixed step size the same way each time", () => {
    expect(SWEEP_ENDS).toHaveLength(SWEEP.length);
    expect(Math.min(...SWEEP_ENDS)).toBeLessThan(SWEEP_ENDS[0] ?? 0);
  });
});

describe("big steps then small: mission and guess", () => {
  it("fires when the steps shrink to nothing before the ball arrives", () => {
    const short = at({ plan: planFor(0.55, 0.9) });
    expect(mission.when(short, endOf(short))).toBe(true);
  });

  it("does not fire for the plan it opens on, or before a walk ends", () => {
    expect(mission.when(at({}), endOf(at({})))).toBe(false);
    const short = at({ plan: planFor(0.55, 0.9) });
    expect(mission.when(short, rollPlan(short)[20])).toBe(false);
    expect(mission.when(short, endOf(at({})))).toBe(false);
  });

  it("answers only from a finished walk of huge steps: they never settle", () => {
    const huge = at({ plan: planFor(0.6, 0) });
    expect(guess.answer(huge, endOf(huge))).toBe("no");
    expect(guess.answer(at({}), endOf(at({})))).toBeNull();
    expect(guess.answer(huge, rollPlan(huge)[5])).toBeNull();
  });
});

describe("big steps then small: links and words", () => {
  it("keeps a hand-made link's numbers on their sliders and dials", () => {
    const saved = {
      plan: [2, -1, "x", 0.5, 0.25, 0.1, 0.9, 0.9],
      bold: 9,
      careful: Number.NaN,
      runs: 1e12,
      view: "moon",
    } as unknown as PlanState;
    expect(definition.parseState?.(saved, initial)).toEqual({
      plan: [1, 0, 0, 0.5, 0.25, 0.1],
      bold: 1,
      careful: 0,
      runs: 10_000,
      view: "plan",
    });
  });

  it("fills a short plan from the plan it opens on", () => {
    const saved = { plan: [0.3] } as unknown as PlanState;
    expect(definition.parseState?.(saved, initial).plan).toEqual([0.3, ...initial.plan.slice(1)]);
  });

  it("says how the walk went", () => {
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
    expect(definition.describe?.(at({}), rollPlan(initial)[3])).toBe(words.describe.walking);
    expect(definition.describe?.(at({}), endOf(at({})))).toBe(words.ending.settled);
  });

  it("compares the plan with its first step kept the whole way", () => {
    expect(definition.compare?.(at({})).plan).toEqual(initial.plan.map(() => initial.plan[0]));
  });
});

describe("big steps then small: in the lesson", () => {
  it("earns the star when the plan stops short", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.careful.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.roll }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(
      () => expect(document.querySelector("[data-ending]")).toHaveTextContent(words.ending.short),
      { timeout: 5000 },
    );
  });

  it("shows every step size in the sweep view", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("radio", { name: words.view.sweep }));
    expect(document.querySelector("[data-sweep]")).toHaveTextContent(words.sweep.yours.bouncing);
  });
});
