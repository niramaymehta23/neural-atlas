import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAgentRun } from "@/engine/rl/agent-host";
import { practiseAgentsInProcess } from "@/engine/rl/testing/in-process-agent";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition } from "./index";
import { missions } from "./missions";
import {
  configOf,
  frameOf,
  GOOD_CATCHES,
  MEMORY_STOPS,
  MOST_GAMES,
  RATE_STOPS,
  runOf,
  SMALLEST_MEMORY,
  START,
  type CatchFrame,
  type CatchState,
} from "./model";
import { predictions } from "./predictions";

practiseAgentsInProcess();

const initial = definition.initialState as CatchState;
const at = (change: { memory?: number; learning?: number; attempt?: number }): CatchState => ({
  ...initial,
  ...change,
});
const [mission] = missions;
const [guess] = predictions;

/** Every frame of a run to `games`, as the lesson records them. */
function frames(state: CatchState, games = MOST_GAMES): CatchFrame[] {
  const run = createAgentRun(configOf(state));
  const recorded = [frameOf(run.moment(), runOf(state))];
  while (run.step < games) {
    run.advance();
    if (run.step % run.every === 0) recorded.push(frameOf(run.moment(), runOf(state)));
  }
  return recorded;
}

describe("a brain for the game: what the missions rest on", () => {
  it("never learns to catch nearly everything with a memory of four games or less, at any step size", () => {
    for (const memory of [0, 1, 2])
      for (let learning = 0; learning < RATE_STOPS.length; learning += 1) {
        const run = frames(at({ memory, learning }));
        expect(Math.max(...run.map((frame) => frame.catches))).toBeLessThan(GOOD_CATCHES);
      }
  }, 30_000);

  it("catches nearly every fruit with the biggest memory from the middle step size up", () => {
    for (let learning = START.learning; learning < RATE_STOPS.length; learning += 1) {
      const run = frames(at({ memory: MEMORY_STOPS.length - 1, learning }));
      const first = run.find((frame) => frame.catches >= GOOD_CATCHES);
      expect(first?.step).toBeLessThanOrEqual(220);
      expect(run.at(-1)?.catches).toBeGreaterThanOrEqual(23);
    }
  }, 30_000);
});

describe("a brain for the game: mission and guess", () => {
  const noMemory = at({ memory: SMALLEST_MEMORY });
  const stalledRun = frames(noMemory);
  const finished = stalledRun.at(-1) as CatchFrame;

  it("fires once a run with no memory of past games has played every game", () => {
    expect(finished.step).toBe(MOST_GAMES);
    expect(mission.when(noMemory, finished)).toBe(true);
    expect(guess.answer(noMemory, finished)).toBe("stalls");
  });

  it("waits for the end of the run, and for the run the dials ask for", () => {
    const halfway = stalledRun.find((frame) => frame.step === 240);
    expect(mission.when(noMemory, halfway)).toBe(false);
    expect(guess.answer(noMemory, halfway)).toBeNull();
    expect(mission.when(at({ memory: SMALLEST_MEMORY, attempt: 1 }), finished)).toBe(false);
    expect(mission.when(noMemory, undefined)).toBe(false);
  });

  it("does not fire for a player that remembers", () => {
    const remembers = frames(initial).at(-1) as CatchFrame;
    expect(mission.when(initial, remembers)).toBe(false);
    expect(guess.answer(initial, remembers)).toBeNull();
  });
});

describe("a brain for the game: links and words", () => {
  it("keeps a hand-made link on the dials and never opens practising", () => {
    const safe = definition.parseState?.(
      { memory: 9.6, learning: -2, attempt: -1, steps: 9999, running: true },
      initial,
    );
    expect(safe).toEqual({
      memory: MEMORY_STOPS.length - 1,
      learning: 0,
      attempt: 0,
      steps: MOST_GAMES,
      running: false,
    });
  });

  it("says how far it has got and how well it catches", () => {
    expect(definition.describe?.(initial, undefined)).toBe("It hasn't practised yet.");
    const done = frames(initial).at(-1);
    expect(definition.describe?.(initial, done)).toBe(
      "500 practice games, all it gets here. It catches every test fruit.",
    );
  });

  it("compares a player that remembers with one that doesn't", () => {
    expect(definition.compare?.(initial).memory).toBe(SMALLEST_MEMORY);
    expect(definition.compare?.(at({ memory: SMALLEST_MEMORY })).memory).toBe(
      MEMORY_STOPS.length - 1,
    );
  });
});

describe("a brain for the game: in the lesson", () => {
  it("practises in the worker and earns the star once its memory is taken away", async () => {
    render(<ModuleShell lesson={{ ...valleyLesson, id: "a-brain-1" }} module={definition} />);
    const scene = await screen.findByTestId("a-brain-for-the-game");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    within(dock).getByRole("slider", { name: words.memory.label }).focus();
    await userEvent.keyboard("{Home}");
    await userEvent.click(within(dock).getByRole("button", { name: words.practise }));
    await waitFor(() => expect(Number(scene.getAttribute("data-step"))).toBe(MOST_GAMES), {
      timeout: 10_000,
    });
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(Number(scene.getAttribute("data-catches"))).toBeLessThan(GOOD_CATCHES);
  }, 30_000);
});
