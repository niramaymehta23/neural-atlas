import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tile } from "@/engine/rl/gridworld";
import { Timeline } from "@/engine/timeline/timeline";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { definition, MOST_WALKS } from "./index";
import { missions } from "./missions";
import {
  frameOf,
  HOME,
  moveShares,
  START,
  VERY_SLIPPERY,
  walkOf,
  workOut,
  type BoardFrame,
  type BoardState,
} from "./model";
import { predictions } from "./predictions";
import { GameBoardScene } from "./scene";

const state = (change: Partial<BoardState> = {}) =>
  ({ ...definition.initialState, ...change }) as BoardState;
const shown = (now: BoardState): BoardFrame => ({ ...frameOf(workOut(now)), epoch: 1 });
const paint = (cells: number[], tile: Tile = "trap") =>
  HOME.map((kind, cell) => (cells.includes(cell) ? tile : kind));
/** Lava above the square in the middle of the bottom lava's top edge: that square is boxed in. */
const BOXED = paint([17]);
const [mission] = missions;
const [guess] = predictions;

describe("the game board: the worked-out kitchen", () => {
  it("has no trap square at any slipperiness until a square is boxed in by lava", () => {
    for (const slippery of [0, 0.2, 0.5, 0.8, 1])
      expect(workOut(state({ slippery })).traps).toEqual([]);
    // Measured: with lava above it, the square in the middle just above the bottom lava is a
    // trap from 0.7 up (its safest chance home is 0.56 at 0.6, 0.49 at 0.7, 0.42 at 0.8).
    expect(workOut(state({ tiles: BOXED, slippery: 0.6 })).traps).toEqual([]);
    expect(workOut(state({ tiles: BOXED, slippery: 0.7 })).traps).toEqual([24]);
    expect(workOut(state({ tiles: BOXED, slippery: VERY_SLIPPERY })).traps).toEqual([24]);
  });

  it("makes the trip home longer on a very slippery floor (measured: 8 moves still, about 27 very slippery)", () => {
    const still = workOut(state({ slippery: 0 }));
    expect(still.trip).toBeCloseTo(8);
    const slippery = workOut(state({ slippery: VERY_SLIPPERY }));
    expect(slippery.stillTrip).toBeCloseTo(8);
    expect(slippery.trip).toBeCloseTo(27.3, 1);
    expect(slippery.home).toBeGreaterThan(0.9);
  });

  it("gives up and steps into the lava when every move is exhausting", () => {
    const worked = workOut(state({ tiring: 1, slippery: 0 }));
    expect(worked.home).toBe(0);
    expect(worked.trip).toBeCloseTo(1);
  });

  it("draws each square's best move longest and the slides beside it", () => {
    expect(moveShares(1, 0.2)).toEqual([0.1, 0.8, 0.1, 0]);
    expect(moveShares(-1, 0.2)).toEqual([0, 0, 0, 0]);
  });

  it("walks the same walk for the same walk number", () => {
    const worked = workOut(state({ slippery: 0.6 }));
    expect(walkOf(0, worked)).toBeNull();
    expect(walkOf(3, worked)).toEqual(walkOf(3, worked));
    expect(walkOf(3, worked)?.path[0]).toBe(START);
  });
});

describe("the game board: mission and guess", () => {
  it("fires on a trap square on screen, and not on a near miss", () => {
    const trapped = state({ tiles: BOXED, slippery: 0.8 });
    expect(mission.when(trapped, shown(trapped))).toBe(true);
    // The frame on screen must be this board's.
    expect(mission.when(trapped, shown(state({ tiles: BOXED, slippery: 0.6 })))).toBe(false);
    const gentle = state({ tiles: BOXED, slippery: 0.6 });
    expect(mission.when(gentle, shown(gentle))).toBe(false);
    const open = state({ slippery: 1 });
    expect(mission.when(open, shown(open))).toBe(false);
  });

  it("answers once the floor is very slippery: the trip gets longer", () => {
    expect(guess.answer(state(), shown(state()))).toBeNull();
    const slippery = state({ slippery: VERY_SLIPPERY });
    expect(guess.answer(slippery, shown(slippery))).toBe("longer");
    expect(guess.answer(slippery, shown(state()))).toBeNull();
    // No bowl: no trip to compare.
    const empty = state({ tiles: paint([34], "floor"), slippery: 1 });
    expect(guess.answer(empty, shown(empty))).toBeNull();
  });
});

describe("the game board: links and words", () => {
  it("makes a hand-made link safe", () => {
    const tiles = [...HOME] as unknown[];
    tiles[START] = "trap";
    tiles[0] = "dragon";
    tiles[1] = "wall";
    const safe = definition.parseState!(
      {
        tiles: tiles.slice(0, 20),
        slippery: 7,
        tiring: -2,
        brush: "rocket",
        walks: 1e12,
      } as unknown as BoardState,
      definition.initialState,
    ) as BoardState;
    expect(safe.tiles).toHaveLength(HOME.length);
    expect(safe.tiles[START]).toBe("floor");
    expect(safe.tiles[0]).toBe("floor");
    expect(safe.tiles[1]).toBe("wall");
    expect(safe.tiles[34]).toBe("goal");
    expect(safe).toMatchObject({ slippery: 1, tiring: 0, brush: "trap", walks: MOST_WALKS });
  });

  it("describes the plan and the traps in a sentence", () => {
    const describe = definition.describe!;
    expect(describe(state({ slippery: 0 }), undefined)).toBe(words.trip.home(8));
    const trapped = state({ tiles: BOXED, slippery: 0.8 });
    expect(describe(trapped, shown(trapped))).toContain(words.describe.traps(1));
    expect(describe(state({ tiles: paint([34], "floor") }), undefined)).toBe(words.bowl["no-goal"]);
    expect(describe(state({ tiring: 1, slippery: 0 }), undefined)).toBe(words.trip.lava);
  });

  it("paints where the board is tapped, never the start square", async () => {
    const update = vi.fn();
    render(
      <GameBoardScene state={state()} update={update} timeline={new Timeline()} side="main" />,
    );
    const board = screen.getByRole("application");
    act(() => board.focus());
    await userEvent.keyboard("{Enter}");
    const atStart = update.mock.calls.at(-1)?.[0] as (s: BoardState) => Partial<BoardState>;
    expect(atStart(state())).toEqual({});
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}");
    const change = update.mock.calls.at(-1)?.[0] as (s: BoardState) => Partial<BoardState>;
    expect(change(state()).tiles?.[17]).toBe("trap");
  });

  it("draws the trap squares dashed and keeps the newest walk in view", () => {
    const { container } = render(
      <GameBoardScene
        state={state({ tiles: BOXED, slippery: 0.8, walks: 2 })}
        update={vi.fn()}
        timeline={new Timeline()}
        side="main"
      />,
    );
    expect(container.querySelectorAll("[data-trap]")).toHaveLength(1);
    const scene = screen.getByTestId("the-game-board");
    expect(scene.dataset.walk).not.toBe("none");
    expect(container.querySelector("[data-trap-line]")?.textContent).toBe(words.traps.some);
  });
});

describe("the game board: in the lesson", () => {
  it("earns the star for a trap square", async () => {
    render(
      <ModuleShell lesson={{ ...valleyLesson, id: "the-game-board-1" }} module={definition} />,
    );
    const board = screen.getByRole("application");
    act(() => board.focus());
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    act(() => within(dock).getByRole("slider", { name: words.slippery.label }).focus());
    await userEvent.keyboard("{End}");
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument());
  });
});
