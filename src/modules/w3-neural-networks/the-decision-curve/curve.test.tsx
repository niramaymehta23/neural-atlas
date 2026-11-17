import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { COPIED, curveRun, isFinished, type CurveFrame, type CurveState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as CurveState;
const at = (change: Partial<CurveState>): CurveState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: CurveState) => [...curveRun(state)].at(-1) as CurveFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `the-decision-curve-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("the decision curve: what the bends can draw", () => {
  it("copies the wave with smooth cells, but never with no bend", () => {
    expect(lastOf(at({})).loss).toBeLessThan(COPIED);
    expect(lastOf(at({ bend: "identity", cells: 12 })).loss).toBeGreaterThan(COPIED * 5);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...curveRun(at({ bend: "relu" }))]).toEqual([...curveRun(at({ bend: "relu" }))]);
  });

  it("keeps runs short enough to play in a few seconds", () => {
    expect([...curveRun(at({}))].length).toBeLessThanOrEqual(121);
  });
});

describe("the decision curve: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when huge steps silence most cut-off cells", () => {
    const silenced = at({ bend: "relu", step: 1 });
    expect(mission.when(silenced, lastOf(silenced))).toBe(true);
  });

  it("does not fire for gentle cut-off cells, leaky ones, or a run still going", () => {
    const gentle = at({ bend: "relu", step: 0.3 });
    expect(mission.when(gentle, lastOf(gentle))).toBe(false);
    const leaky = at({ bend: "leakyRelu", step: 1 });
    expect(mission.when(leaky, lastOf(leaky))).toBe(false);
    const silenced = at({ bend: "relu", step: 1 });
    expect(mission.when(silenced, [...curveRun(silenced)][1])).toBe(false);
  });

  it("answers the no-bend question from a finished run with no bend on the wave", () => {
    const straight = at({ bend: "identity" });
    expect(guess.answer(straight, lastOf(straight))).toBe("no");
    expect(guess.answer(at({}), lastOf(at({})))).toBeNull();
    expect(guess.answer(straight, undefined)).toBeNull();
  });
});

describe("the decision curve: links and words", () => {
  it("keeps a hand-made link on its dials and choices", () => {
    const safe = definition.parseState!(
      { bend: "wiggle", shape: "hill", step: 7, cells: 400, runs: -3 } as unknown as CurveState,
      initial,
    ) as CurveState;
    expect(safe).toEqual({ bend: "tanh", shape: "hill", step: 1, cells: 12, runs: 0 });
  });

  it("describes the cells before and after practice", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/waiting to practise/);
    const done = at({});
    const end = lastOf(done);
    expect(isFinished(done, end)).toBe(true);
    expect(definition.describe?.(done, end)).toMatch(/goes through the dots/);
  });
});

describe("the decision curve: in the lesson", () => {
  it("draws a line once the cells practise", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    await waitFor(() => expect(document.querySelector("[data-curve]")).not.toBeNull());
  });

  it("earns the star once cut-off cells go silent", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("radio", { name: words.bend.names.relu }));
    screen.getByRole("slider", { name: words.step.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});
