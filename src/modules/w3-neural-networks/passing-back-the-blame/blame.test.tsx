import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import { blameRun, ROUNDS, startShare, type BlameFrame, type BlameState } from "./model";
import { predictions } from "./predictions";

const initial = definition.initialState as BlameState;
const at = (change: Partial<BlameState>): BlameState => ({ ...initial, runs: 1, ...change });
const lastOf = (state: BlameState) => [...blameRun(state)].at(-1) as BlameFrame;

let lessons = 0;
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `passing-back-the-blame-${(lessons += 1)}` }}
      module={definition}
    />,
  );

describe("passing back the blame: the rain", () => {
  it("reports blame for every layer of threads, every moment of the run", () => {
    const frames = [...blameRun(at({ layers: 4 }))];
    expect(frames.at(-1)?.epoch).toBe(ROUNDS);
    expect(frames.length).toBeLessThanOrEqual(121);
    expect(frames.every(({ blame }) => blame.length === 5)).toBe(true);
  });

  it("dries up in a deep stack of S-shaped cells, but not with leaky cut-off cells", () => {
    expect(startShare(lastOf(at({ layers: 6 })))).toBeLessThan(0.01);
    expect(startShare(lastOf(at({ layers: 6, bend: "leakyRelu" })))).toBeGreaterThan(0.1);
  });

  it("is the same run every time, so a link replays it", () => {
    expect([...blameRun(at({ layers: 3 }))]).toEqual([...blameRun(at({ layers: 3 }))]);
  });
});

describe("passing back the blame: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when the rain dries before the start in an S-shaped stack", () => {
    const deep = at({ layers: 5 });
    expect(mission.when(deep, lastOf(deep))).toBe(true);
  });

  it("does not fire for a shallow stack, leaky cells or a run still going", () => {
    expect(mission.when(at({ layers: 1 }), lastOf(at({ layers: 1 })))).toBe(false);
    const leaky = at({ layers: 6, bend: "leakyRelu" });
    expect(mission.when(leaky, lastOf(leaky))).toBe(false);
    const deep = at({ layers: 5 });
    expect(mission.when(deep, [...blameRun(deep)][3])).toBe(false);
  });

  it("answers the guess from a finished deep S-shaped run", () => {
    const deep = at({ layers: 6 });
    expect(guess.answer(deep, lastOf(deep))).toBe("start");
    expect(guess.answer(at({ layers: 2 }), lastOf(at({ layers: 2 })))).toBeNull();
    expect(guess.answer(deep, undefined)).toBeNull();
  });
});

describe("passing back the blame: links and words", () => {
  it("keeps a hand-made link on its dials", () => {
    const safe = definition.parseState!(
      { layers: 40, bend: "relu", step: -1, runs: 3.4 } as unknown as BlameState,
      initial,
    ) as BlameState;
    expect(safe).toEqual({ layers: 8, bend: "sigmoid", step: 0, runs: 3 });
  });

  it("describes the stack before and after practice", () => {
    expect(definition.describe?.(initial, undefined)).toMatch(/two layers of three cells/);
    const deep = at({ layers: 6 });
    expect(definition.describe?.(deep, lastOf(deep))).toBe(words.reach.dry);
  });
});

describe("passing back the blame: in the lesson", () => {
  it("lets the rain fall once it practises", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    await waitFor(() => expect(document.querySelector("[data-gradient-rain]")).not.toBeNull(), {
      timeout: 5000,
    });
  });

  it("earns the star once the rain dries up before the start", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    screen.getByRole("slider", { name: words.layers.label }).focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(screen.getByRole("button", { name: words.practise }));
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });
});
