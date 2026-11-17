import { act, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import type { Tile } from "@/engine/rl/gridworld";
import { createQRunner } from "@/engine/rl/q-learning";
import { Timeline } from "@/engine/timeline/timeline";
import { words } from "./captions";
import { dialWords, Telescope } from "./controls";
import { describeScoring } from "./describe";
import { definition, MOST_EDITS, MOST_MOVES } from "./index";
import { missions } from "./missions";
import {
  bowlFor,
  encodeBoard,
  heat,
  HEAT_TRIES,
  KITCHEN,
  replay,
  SEED,
  settingsOf,
  tryFrame,
  withEdit,
  worldOf,
  type ScoringFrame,
  type ScoringState,
} from "./model";
import { ScoringScene, SYNC_MS } from "./scene";

const initial = definition.initialState as unknown as ScoringState;
const parse = definition.parseState as unknown as (
  saved: ScoringState,
  initial: ScoringState,
) => ScoringState;
const state = (change: Partial<ScoringState> = {}): ScoringState => ({ ...initial, ...change });

/** The kitchen with some squares repainted, by index. */
const kitchenWith = (paint: Record<number, Tile>) =>
  KITCHEN.map((tile, index) => paint[index] ?? tile);

/** Plays `tries` tries with these dials and board, keeping every frame. */
function practise(change: Partial<ScoringState>, tries: number, seed: number) {
  const now = state(change);
  const runner = createQRunner(worldOf(now.tiles), settingsOf(now), seed);
  const frames: ScoringFrame[] = [];
  while (runner.episodes < tries)
    for (const episode of runner.advance(1)) frames.push(tryFrame(episode, runner, frames.at(-1)));
  return frames;
}

const mission = (id: string) => {
  const found = missions.find((each) => each.id === id);
  if (!found) throw new Error(`no mission ${id}`);
  return found;
};

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe("a shared link replays the run exactly (QL-07)", () => {
  it("replays an edit log to the same scores as the live run", () => {
    const walled = kitchenWith({ 15: "wall", 16: "coin" });
    // Live: play, repaint and turn a dial mid-run, play on.
    const live = createQRunner(worldOf(KITCHEN), settingsOf(state()), SEED);
    let log = withEdit([], 0, state());
    live.advance(700);
    live.setWorld(worldOf(walled));
    log = withEdit(log, live.moves, state({ tiles: walled }));
    live.advance(400);
    live.configure(settingsOf(state({ learnRate: 1 })));
    log = withEdit(log, live.moves, state({ tiles: walled, learnRate: 1 }));
    live.advance(900);

    const replayed = replay(state({ tiles: walled, learnRate: 1, moves: live.moves, log }));
    expect(replayed.moves).toBe(live.moves);
    expect(replayed.episodes).toBe(live.episodes);
    expect([...replayed.q]).toEqual([...live.q]);
  });

  it("keeps an older link's count of tries, with no cap", () => {
    expect(replay(state({ episodes: 2500 })).episodes).toBe(2500);
  });

  it("logs a change once, and a change at the same move replaces the last", () => {
    const first = withEdit([], 0, state());
    expect(withEdit(first, 10, state())).toBe(first);
    const turned = withEdit(first, 0, state({ learnRate: 1 }));
    expect(turned).toHaveLength(1);
    expect(turned[0]?.dials[1]).toBe(1);
  });

  it("clamps a link's log, moves and dials", () => {
    const parsed = parse(
      {
        ...state(),
        moves: 1e12,
        log: [
          { moves: 50, board: encodeBoard(KITCHEN) + "extra", dials: [9, -2, 0.5] },
          { moves: 10, board: "#", dials: [0, 0, 0] },
          { moves: "x", board: 1, dials: [] },
          ...Array.from({ length: MOST_EDITS + 10 }, () => ({
            moves: 60,
            board: "",
            dials: [0, 0, 0],
          })),
        ],
      } as unknown as ScoringState,
      state(),
    );
    expect(parsed.moves).toBe(MOST_MOVES);
    expect(parsed.log.length).toBeLessThanOrEqual(MOST_EDITS);
    expect(parsed.log[0]).toEqual({ moves: 50, board: encodeBoard(KITCHEN), dials: [1, 0, 0.5] });
    // Moves never run backwards.
    expect(parsed.log[1]?.moves).toBe(50);
  });
});

describe("the scene", () => {
  it("jumps back to now before painting a board scrubbed back in time (QL-01)", async () => {
    const timeline = new Timeline<ScoringFrame>();
    function Live() {
      const [now, setNow] = useState(state({ episodes: 20, brush: "trap" }));
      // Stable, like the shell's.
      const update = useCallback(
        (change: Partial<ScoringState> | ((before: ScoringState) => Partial<ScoringState>)) =>
          setNow((before) => ({
            ...before,
            ...(typeof change === "function" ? change(before) : change),
          })),
        [],
      );
      return <ScoringScene state={now} update={update} timeline={timeline} side="main" />;
    }
    await act(async () => {
      render(<Live />);
    });
    act(() => timeline.seek(3));
    expect(timeline.getState().live).toBe(false);

    const board = screen.getByRole("application");
    act(() => board.focus());
    fireEvent.keyDown(board, { key: "ArrowUp" });
    fireEvent.keyDown(board, { key: "Enter" });
    expect(timeline.getState().live).toBe(true);
    expect(document.querySelectorAll('[data-tile="trap"]')).toHaveLength(
      KITCHEN.filter((tile) => tile === "trap").length + 1,
    );
    // Keyboard painting is spoken (QL-13, A11Y-12).
    expect(
      screen.getByText(words.paint.square("four", "one", words.paint.kinds.trap)),
    ).toBeTruthy();
  });

  it("saves its progress a few times a second while playing, and exactly on pause (QL-12)", () => {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
    });
    try {
      const update = vi.fn();
      const props = {
        update,
        timeline: new Timeline<ScoringFrame>(),
        side: "main" as const,
      };
      const { rerender } = render(<ScoringScene state={state({ playing: true })} {...props} />);
      update.mockClear();
      act(() => vi.advanceTimersByTime(1000));
      const saves = update.mock.calls.filter(
        ([change]) => typeof change === "object" && "moves" in change,
      );
      expect(saves.length).toBeGreaterThan(0);
      expect(saves.length).toBeLessThanOrEqual(Math.ceil(1000 / SYNC_MS) + 1);

      update.mockClear();
      act(() => vi.advanceTimersByTime(100));
      rerender(<ScoringScene state={state({ playing: false })} {...props} />);
      expect(update.mock.calls.at(-1)?.[0]).toHaveProperty("moves");
    } finally {
      vi.useRealTimers();
    }
  });

  it("says when the bowl is missing or walled off (QL-05)", async () => {
    await act(async () => {
      render(
        <ScoringScene
          state={state({ tiles: KITCHEN.map((tile) => (tile === "goal" ? "floor" : tile)) })}
          update={vi.fn()}
          timeline={new Timeline<ScoringFrame>()}
          side="main"
        />,
      );
    });
    expect(screen.getByText(words.bowl["no-goal"])).toHaveAttribute("data-bowl", "no-goal");
  });

  it("draws no arrows before it has learned anything, then one best arrow per square (QL-09)", async () => {
    const timeline = new Timeline<ScoringFrame>();
    const { container, unmount } = render(
      <ScoringScene state={state()} update={vi.fn()} timeline={timeline} side="main" />,
    );
    expect(container.querySelectorAll("[data-arrow]")).toHaveLength(0);
    expect(screen.getByTestId("scoring-every-move").dataset.heat).toBe("0.00");
    unmount();

    await act(async () => {
      render(
        <ScoringScene
          state={state({ episodes: 300 })}
          update={vi.fn()}
          timeline={new Timeline<ScoringFrame>()}
          side="main"
        />,
      );
    });
    const best = document.querySelectorAll('[data-arrow="best"]').length;
    expect(best).toBeGreaterThan(5);
    expect(document.querySelectorAll('[data-arrow="other"]')).toHaveLength(best * 3);
    expect(screen.getByTestId("scoring-every-move").dataset.heat).toBe("1.00");
  });

  it("starts its count with a capital letter (QL-18)", () => {
    expect(words.tries(0)).toBe("Zero tries so far.");
    expect(words.tries(1)).toBe("One try so far.");
    expect(words.tries(2)).toBe("Two tries so far.");
    expect(words.tries(12)).toBe("12 tries so far.");
  });
});

describe("dials and their words", () => {
  it("only says it never tries new moves when it really never does (QL-02)", () => {
    expect(dialWords.curiosity(initial.curiosity)).not.toBe(words.curiosity.never);
    expect(dialWords.curiosity(0)).toBe(words.curiosity.never);
  });

  it("says it changes its mind at once exactly where the mission starts (QL-16)", () => {
    expect(dialWords.learnRate(0.84)).toBe(words.learnRate.medium);
    expect(dialWords.learnRate(0.85)).toBe(words.learnRate.fast);
  });

  it("starts at a pace you can follow, and names speeds by real moves a second (QL-11)", () => {
    expect([words.speed.walk, words.speed.trot]).toContain(dialWords.speed(initial.speed));
    expect(dialWords.speed(0)).toBe(words.speed.walk);
    expect(dialWords.speed(1)).toBe(words.speed.blur);
  });

  it("the telescope sees further as it cares further ahead (QL-17)", () => {
    const seen = (lookAhead: number) => {
      const { container, unmount } = render(<Telescope lookAhead={lookAhead} />);
      const value = Number(container.querySelector("[data-telescope]")?.getAttribute("data-seen"));
      unmount();
      return value;
    };
    expect(seen(0)).toBeLessThan(seen(0.5));
    expect(seen(0.5)).toBeLessThan(seen(1));
  });

  it("fades the board's tint in over the first tries (QL-17)", () => {
    expect(heat(0)).toBe(0);
    expect(heat(HEAT_TRIES / 2)).toBe(0.5);
    expect(heat(HEAT_TRIES * 3)).toBe(1);
  });
});

describe("the new missions (QL-03, QL-05, QL-17)", () => {
  it("a treat beside the start becomes a loophole the puppy paces on", () => {
    const loophole = mission("find-a-loophole");
    const treat = state({ tiles: kitchenWith({ 21: "coin" }) });
    const found = SEEDS.filter((seed) =>
      practise(treat, 200, seed).some((frame) => loophole.when(treat, frame)),
    );
    expect(found.length).toBeGreaterThanOrEqual(6);
    for (const seed of SEEDS.slice(0, 3))
      expect(practise({}, 200, seed).some((frame) => loophole.when(state(), frame))).toBe(false);
  });

  it("no curiosity at all, for long enough, is never trying anything new", () => {
    const never = mission("never-explore");
    const still = state({ curiosity: 0 });
    expect(practise(still, 40, 1).some((frame) => never.when(still, frame))).toBe(true);
    expect(practise({}, 40, 1).some((frame) => never.when(state(), frame))).toBe(false);
  });

  it("a bowl walled in by lava is a maze it can't solve", () => {
    const solve = mission("no-way-through");
    const sealed = kitchenWith({ 27: "trap", 20: "wall" });
    expect(bowlFor(sealed)).toBe("blocked");
    const frames = practise({ tiles: sealed }, 3, 1);
    expect(frames.some((frame) => solve.when(state({ tiles: sealed }), frame))).toBe(true);
    expect(practise({}, 3, 1).some((frame) => solve.when(state(), frame))).toBe(false);
  });

  it("describes the board in one sentence for screen readers", () => {
    expect(describeScoring(state(), undefined)).toBe(words.describe.idle);
    const sealed = kitchenWith({ 27: "trap", 20: "wall" });
    expect(describeScoring(state({ tiles: sealed }), undefined)).toBe(words.bowl.blocked);
    const learned = practise({}, 300, 1).at(-1);
    expect([words.describe.found, words.describe.looking]).toContain(
      describeScoring(state(), learned),
    );
  });
});
