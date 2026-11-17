import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Timeline } from "@/engine/timeline/timeline";
import type { Update } from "@/platform/contract";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { predictionWords, words } from "./captions";
import { DownhillDrawer } from "./drawer";
import { definition } from "./index";
import { rollDown, STEPS } from "@/features/building/race/race";
import type { DownhillFrame, DownhillState } from "./model";
import { DownhillScene } from "./scene";

const initial = definition.initialState as DownhillState;
let lessons = 0;
const guessCard = () => within(screen.getByRole("region", { name: "Make a guess" }));
const renderLesson = () =>
  render(
    <ModuleShell
      lesson={{ ...valleyLesson, id: `rolling-downhill-${(lessons += 1)}` }}
      module={definition}
    />,
  );

/** The scene on its own, holding its state like the shell does. */
function Harness({
  start,
  timeline,
  onUpdate,
}: {
  start: DownhillState;
  timeline: Timeline<DownhillFrame>;
  onUpdate?: (set: (change: Partial<DownhillState>) => void) => void;
}) {
  const [state, setState] = useState(start);
  const update: Update<DownhillState> = (change) =>
    setState((now) => ({ ...now, ...(typeof change === "function" ? change(now) : change) }));
  onUpdate?.((change) => update(change));
  return <DownhillScene state={state} update={update} timeline={timeline} side="main" />;
}

describe("rolling downhill: a roll always finishes (DH-01)", () => {
  beforeEach(() => {
    // A hidden tab: animation frames never come.
    vi.stubGlobal("requestAnimationFrame", () => 0);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("records the whole roll even when no animation frame ever comes", () => {
    const timeline = new Timeline<DownhillFrame>();
    render(<Harness start={{ ...initial, runs: 1 }} timeline={timeline} />);
    expect(timeline.getState().length).toBe(STEPS + 1);
    expect(timeline.at(STEPS)?.epoch).toBe(STEPS);
  });

  it("lets the guess be revealed and the walkers roll again", async () => {
    renderLesson();
    await userEvent.click(guessCard().getByRole("button", { name: words.walkers.sgd }));
    await userEvent.click(screen.getByRole("button", { name: words.roll }));
    expect(screen.getByRole("button", { name: "Show me what happens" })).toBeEnabled();
    expect(screen.getByRole("button", { name: words.rollAgain })).toBeEnabled();
  });
});

describe("rolling downhill: guesses are made before a roll (DH-02)", () => {
  it("keeps the reveal waiting for a guess made after a roll, until the next roll", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    await userEvent.click(screen.getByRole("button", { name: words.roll }));
    await userEvent.click(guessCard().getByRole("button", { name: predictionWords.none }));
    expect(screen.getByRole("button", { name: "Play a little more, then look." })).toBeDisabled();
    // The guess can still change: it is not locked to a roll that already happened.
    expect(guessCard().getByRole("button", { name: words.walkers.adam })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: words.rollAgain }));
    expect(screen.getByRole("button", { name: "Show me what happens" })).toBeEnabled();
  });

  it("shows the guessed stopping spots as see-through shapes", async () => {
    const timeline = new Timeline<DownhillFrame>();
    render(
      <Harness
        start={{
          ...initial,
          marks: [
            { x: 0, z: 0 },
            { x: 0.2, z: 0.1 },
          ],
          marksFor: 1,
        }}
        timeline={timeline}
      />,
    );
    expect(document.querySelectorAll("[data-ghost]")).toHaveLength(2);
    await userEvent.click(screen.getByRole("radio", { name: words.tapMode.guess }));
    expect(screen.getByText(words.nextGuess.adam)).toBeInTheDocument();
  });

  it("says how close each guess was once the roll has played to its end", () => {
    const end = rollDown(initial).at(-1);
    const steady = end?.walkers[0] ?? { x: 0, z: 0 };
    const timeline = new Timeline<DownhillFrame>();
    render(
      <Harness
        start={{ ...initial, runs: 1, marks: [steady, { x: -0.9, z: -0.9 }], marksFor: 1 }}
        timeline={timeline}
      />,
    );
    act(() => timeline.goLive());
    expect(screen.getByText(`· ${words.guessed.close}`)).toBeInTheDocument();
    expect(screen.getByText(`· ${words.guessed.far}`)).toBeInTheDocument();
  });
});

describe("rolling downhill: turning a dial (DH-05)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("rolls again once after the dial rests, keeping the roll before as the ghost", () => {
    const timeline = new Timeline<DownhillFrame>();
    const newRun = vi.spyOn(timeline, "newRun");
    let set: (change: Partial<DownhillState>) => void = () => undefined;
    const first = { ...initial, runs: 1 };
    render(<Harness start={first} timeline={timeline} onUpdate={(next) => (set = next)} />);
    expect(newRun).toHaveBeenCalledTimes(1);
    for (let tick = 1; tick <= 10; tick += 1) {
      act(() => set({ step: initial.step + tick * 0.02 }));
      act(() => vi.advanceTimersByTime(50));
    }
    expect(newRun).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(newRun).toHaveBeenCalledTimes(2);
    expect(timeline.ghostFrames()).toEqual(rollDown(first));
    expect(timeline.at(0)?.walkers).toEqual(
      rollDown({ ...first, step: initial.step + 0.2 })[0]?.walkers,
    );
  });
});

describe("rolling downhill: the drawer follows the timeline (DH-07)", () => {
  it("shows the steady walker's rule with the numbers of the step on screen", () => {
    const timeline = new Timeline<DownhillFrame>();
    for (const frame of rollDown(initial)) timeline.record(frame);
    render(
      <DownhillDrawer state={initial} update={() => undefined} timeline={timeline} side="main" />,
    );
    act(() => timeline.seek(3));
    const rule = document.querySelector("[data-live-rule]");
    expect(rule).toHaveTextContent(words.drawer.live.step("3"));
    act(() => timeline.seek(7));
    expect(rule).toHaveTextContent(words.drawer.live.step("7"));
  });
});

describe("rolling downhill: describing the scene", () => {
  it("says what happened to each walker once the roll is over", () => {
    const end = rollDown({ ...initial, step: 1 }).at(-1);
    expect(definition.describe?.({ ...initial, runs: 1 }, end)).toMatch(/flew off the map/);
    expect(definition.describe?.(initial, undefined)).toBe(words.describe.waiting);
  });
});
