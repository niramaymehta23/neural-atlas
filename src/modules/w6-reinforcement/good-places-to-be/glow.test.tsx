import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tile } from "@/engine/rl/gridworld";
import { Timeline } from "@/engine/timeline/timeline";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition, MOST_RUNS } from "./index";
import { missions } from "./missions";
import {
  ASKED_AFTER,
  GARDEN,
  glowRun,
  leansAt,
  START,
  WARM,
  type GlowFrame,
  type GlowState,
} from "./model";
import { predictions } from "./predictions";
import { GlowScene } from "./scene";

const WAIT = { timeout: 10_000 };
const BOWL = 6;
const state = (change: Partial<GlowState> = {}) =>
  ({ ...definition.initialState, runs: 1, ...change }) as GlowState;
const run = (now: GlowState) => [...glowRun(now)];
const paint = (cells: number[], tile: Tile) =>
  GARDEN.map((kind, cell) => (cells.includes(cell) ? tile : kind));
const NO_BOWL = paint([BOWL], "floor");
const [mission] = missions;
const [guess] = predictions;
const DIALS = [0, 0.3, 0.6, 0.9, 1];

describe("good places to be: the glow", () => {
  it("spreads one square further from the bowl each sweep", () => {
    const frames = run(state({ slippery: 0 }));
    expect(frames[0]?.values.every((value) => value === 0)).toBe(true);
    // Beside the bowl first; the square two moves away only on the second spread.
    expect(frames[1]?.values[5]).toBeGreaterThan(0);
    expect(frames[1]?.values[4]).toBe(0);
    expect(frames[2]?.values[4]).toBeGreaterThan(0);
    expect(frames.map((frame) => frame.epoch)).toEqual(frames.map((_, at) => at));
    expect(frames.at(-1)?.last).toBe(true);
    expect(frames.slice(0, -1).some((frame) => frame.last)).toBe(false);
  });

  it("warms the puppy's corner only after ten spreads at the start dials (it is ten moves away)", () => {
    const frames = run(state());
    expect(frames.at(-1)?.warmFrom).toBe(10);
    expect(frames[ASKED_AFTER]?.values[START]).toBe(0);
  });

  it("never warms the corner within three spreads on the garden, whatever the dials (measured)", () => {
    for (const care of DIALS)
      for (const slippery of DIALS) {
        const last = run(state({ care, slippery })).at(-1);
        expect(last?.warmFrom === -1 || (last?.warmFrom ?? 0) > ASKED_AFTER).toBe(true);
      }
  });

  it("stops within a few dozen spreads (measured: 11 still, at most 42)", () => {
    for (const care of DIALS)
      for (const slippery of DIALS)
        expect(run(state({ care, slippery })).length).toBeLessThanOrEqual(44);
    expect(run(state({ slippery: 0 }))).toHaveLength(12);
  });

  it("leaves a far corner cold when it cares only about right now", () => {
    const last = run(state({ care: 0.3 })).at(-1);
    expect(last?.warmFrom).toBe(-1);
    expect(last?.warm).toBeGreaterThan(0);
  });

  it("points each square's arrow towards the warmth, and none where nothing pays", () => {
    const last = run(state()).at(-1);
    const leans = leansAt(state(), last?.values ?? []);
    expect(leans[5]).toBe(1); // beside the bowl: step right into it
    expect(leans[START]).not.toBe(-1);
    const empty = state({ tiles: paint([BOWL, 18], "floor") });
    const cold = leansAt(empty, run(empty).at(-1)?.values ?? []);
    expect(cold.every((lean) => lean === -1)).toBe(true);
  });

  it("replays the same glow for the same board and dials", () => {
    expect(run(state({ care: 0.7, slippery: 0.4 }))).toEqual(
      run(state({ care: 0.7, slippery: 0.4 })),
    );
  });
});

describe("good places to be: mission and guess", () => {
  it("fires once a glow with no reward finishes cold, and not while a bowl glows", () => {
    const hidden = state({ tiles: NO_BOWL });
    const frames = run(hidden);
    expect(frames.at(-1)?.warm).toBe(0);
    expect(mission.when(hidden, frames.at(-1))).toBe(true);
    expect(mission.when(hidden, { ...frames.at(-1)!, last: false })).toBe(false);
    const glowing = state();
    expect(mission.when(glowing, run(glowing).at(-1))).toBe(false);
    // A frame from another board does not count.
    expect(mission.when(glowing, frames.at(-1))).toBe(false);
    // A walled-in bowl hides it too.
    const walled = state({ tiles: paint([5, 13], "wall") });
    expect(mission.when(walled, run(walled).at(-1))).toBe(true);
  });

  it("answers “not yet” for the garden once a glow has finished", () => {
    const frames = run(state());
    expect(guess.answer(state(), frames[ASKED_AFTER])).toBeNull();
    expect(guess.answer(state(), frames.at(-1))).toBe("not-yet");
    const close = state({ tiles: paint([14], "goal") });
    expect(guess.answer(close, run(close).at(-1))).toBe("warm");
  });
});

describe("good places to be: links and words", () => {
  it("makes a hand-made link safe", () => {
    const tiles = [...GARDEN] as unknown[];
    tiles[0] = "coin";
    tiles[1] = "trap";
    tiles[START] = "goal";
    const safe = definition.parseState!(
      { tiles, care: -1, slippery: 3, brush: "coin", runs: -5 } as unknown as GlowState,
      definition.initialState,
    ) as GlowState;
    expect(safe.tiles[0]).toBe("floor");
    expect(safe.tiles[1]).toBe("trap");
    expect(safe.tiles[START]).toBe("floor");
    expect(safe).toMatchObject({ care: 0, slippery: 1, brush: "wall", runs: 0 });
    const many = definition.parseState!(
      { ...definition.initialState, runs: 1e9 } as GlowState,
      definition.initialState,
    ) as GlowState;
    expect(many.runs).toBe(MOST_RUNS);
  });

  it("describes the spread and the corner", () => {
    const describe = definition.describe!;
    expect(describe(state({ runs: 0 }), undefined)).toBe(words.waiting);
    const last = run(state()).at(-1) as GlowFrame;
    expect(describe(state(), last)).toBe(`${words.spreads(last.epoch)} ${words.corner.warm}`);
    expect(describe(state({ tiles: NO_BOWL }), undefined)).toBe(words.bowl["no-goal"]);
    expect(WARM).toBeLessThan(last.values[START] ?? 0);
  });

  it("records one moment per spread on the timeline", async () => {
    const timeline = new Timeline<GlowFrame>();
    render(<GlowScene state={state()} update={vi.fn()} timeline={timeline} side="main" />);
    await waitFor(() => expect(timeline.getState().length).toBe(run(state()).length), WAIT);
    act(() => timeline.goLive());
    expect(screen.getByTestId("good-places-to-be").dataset.corner).toBe("warm");
  }, 15_000);
});

describe("good places to be: in the lesson", () => {
  it("earns the star for hiding the bowl", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "good-places-to-be-1" }} module={definition} />,
    );
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await userEvent.click(within(dock).getByRole("radio", { name: words.brush.floor }));
    const board = screen.getByRole("application");
    act(() => board.focus());
    await userEvent.keyboard(
      "{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}",
    );
    await userEvent.click(within(dock).getByRole("button", { name: words.spread }));
    await waitFor(
      () => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(),
      WAIT,
    );
  }, 15_000);
});
