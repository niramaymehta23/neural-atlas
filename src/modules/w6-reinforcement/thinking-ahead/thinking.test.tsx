import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockReducedMotion } from "@/design/reduced-motion.mock";
import { fromMoves, threatsAgainst } from "@/engine/rl/connect-four";
import { createSearch, oneMoveAhead } from "@/engine/rl/mcts";
import { valleyLesson } from "@/platform/fixture/fixture-module";
import { ModuleShell } from "@/platform/ModuleShell";
import { words } from "./captions";
import { describeAhead } from "./describe";
import { definition } from "./index";
import { missions } from "./missions";
import {
  BLOCKS_FROM,
  DEFAULT_FUTURES,
  FOCUSED,
  FUTURES,
  IT,
  keyOf,
  LENGTHS,
  missedThePuzzle,
  ONE_MOVE_AHEAD,
  positionSeed,
  PUZZLE,
  settingsOf,
  THREAT,
  thinkingAt,
  YOU,
  type AheadFrame,
  type AheadState,
} from "./model";
import { predictions } from "./predictions";
import { favouriteOf } from "./scene";

const initial = definition.initialState as AheadState;
const puzzle = [...PUZZLE];

/** Its thinking about `moves` at the given dial steps, worked out to the end. */
function thought(moves: number[], futures: number, length = LENGTHS.length - 1) {
  const search = createSearch(
    fromMoves(moves),
    settingsOf({ futures, length }),
    positionSeed(moves),
  );
  search.step(search.total);
  const total = search.bloom().reduce((sum, branch) => sum + branch.visits, 0);
  return {
    pick: search.choice(),
    topShare: (favouriteOf(search.bloom())?.visits ?? 0) / total,
  };
}

const frameFor = (
  moves: number[],
  futures: number,
  change: Partial<AheadFrame> = {},
): AheadFrame => {
  const { pick, topShare } = thought(moves, futures);
  return {
    epoch: 1,
    loss: 0,
    key: keyOf(moves, { futures, length: LENGTHS.length - 1 }),
    finished: true,
    puzzle: moves.length === PUZZLE.length,
    futures,
    topShare,
    pick,
    ...change,
  };
};

describe("thinking ahead: the puzzle, measured", () => {
  it("is its turn, with your slant one disc from four in the far-right column", () => {
    const board = fromMoves(puzzle);
    expect(board.turn).toBe(IT);
    expect(board.outcome).toBe(0);
    expect(threatsAgainst(board)).toEqual([THREAT]);
  });

  it("is missed when it looks only one move ahead: it drops in the middle", () => {
    expect(oneMoveAhead(fromMoves(puzzle))).toBe(3);
    expect(thought(puzzle, ONE_MOVE_AHEAD).pick).toBe(3);
  });

  it("is blocked from about a hundred pretend games up, however long each one runs", () => {
    for (let futures = BLOCKS_FROM; futures < FUTURES.length; futures += 1)
      for (let length = 0; length < LENGTHS.length; length += 1)
        expect(thought(puzzle, futures, length).pick, `${futures}/${length}`).toBe(THREAT);
  }, 30_000);

  it("piles most of thousands of pretend games into the blocking column", () => {
    for (let futures = DEFAULT_FUTURES; futures < FUTURES.length; futures += 1)
      for (let length = 0; length < LENGTHS.length; length += 1)
        expect(
          thought(puzzle, futures, length).topShare,
          `${futures}/${length}`,
        ).toBeGreaterThanOrEqual(FOCUSED);
    // One look per column is spread evenly.
    expect(thought(puzzle, ONE_MOVE_AHEAD).topShare).toBeCloseTo(1 / 7);
  }, 30_000);

  it("thinks about the board now on its turn, and about its last move on yours", () => {
    expect(thinkingAt([])).toBeNull();
    expect(thinkingAt([3])).toEqual([3]);
    expect(thinkingAt([3, 4])).toEqual([3]);
    expect(thinkingAt([3, 4, 2])).toEqual([3, 4, 2]);
    expect(thinkingAt([3, 4, 2, 2])).toEqual([3, 4, 2]);
    // A won game: its thinking for the last move it made.
    expect(thinkingAt([...puzzle, 3, THREAT])).toEqual(puzzle);
    expect(positionSeed([3, 4])).toBe(positionSeed([3, 4]));
    expect(positionSeed([3, 4])).not.toBe(positionSeed([4, 3]));
  });
});

describe("thinking ahead: mission and guess", () => {
  const [mission] = missions;
  const [guess] = predictions;

  it("fires when it misses your slant and your next disc wins", () => {
    expect(mission.when({ ...initial, moves: [...puzzle, 3, THREAT] })).toBe(true);
    // Near misses: it blocked; you have not dropped yet; you dropped elsewhere; not the puzzle.
    expect(mission.when({ ...initial, moves: [...puzzle, THREAT, 0] })).toBe(false);
    expect(mission.when({ ...initial, moves: [...puzzle, 3] })).toBe(false);
    expect(mission.when({ ...initial, moves: [...puzzle, 3, 0] })).toBe(false);
    expect(missedThePuzzle([0, 1, 0, 1, 0, 1, 0])).toBe(false);
  });

  it("answers from a finished thinking about the puzzle with thousands of pretend games", () => {
    expect(guess.answer(initial, frameFor(puzzle, DEFAULT_FUTURES))).toBe("one");
    expect(
      guess.answer(initial, frameFor(puzzle, DEFAULT_FUTURES, { finished: false })),
    ).toBeNull();
    // Too few pretend games, another position, or nothing yet: still waiting.
    expect(guess.answer(initial, frameFor(puzzle, ONE_MOVE_AHEAD))).toBeNull();
    expect(guess.answer(initial, frameFor([3], DEFAULT_FUTURES, { puzzle: false }))).toBeNull();
    expect(guess.answer(initial, undefined)).toBeNull();
  }, 20_000);
});

describe("thinking ahead: links and words", () => {
  it("keeps a hand-made link's game playable and its dials on their steps", () => {
    const safe = definition.parseState!(
      { moves: [3, 3, 9, 1], futures: 40, length: -3 } as unknown as AheadState,
      initial,
    ) as AheadState;
    expect(safe).toEqual({ moves: [3, 3], futures: FUTURES.length - 1, length: 0 });
    const long = definition.parseState!(
      { ...initial, moves: Array.from({ length: 80 }, (_, at) => at % 7) },
      initial,
    ) as AheadState;
    expect(long.moves.length).toBeLessThanOrEqual(42);
  });

  it("compares one move ahead with thousands of pretend games", () => {
    expect(definition.compare?.(initial)).toMatchObject({ futures: ONE_MOVE_AHEAD });
    expect(definition.compare?.({ ...initial, futures: ONE_MOVE_AHEAD })).toMatchObject({
      futures: DEFAULT_FUTURES,
    });
  });

  it("describes whose turn it is, how it ended and where it looked", () => {
    expect(describeAhead(initial, undefined)).toBe(words.describe.start);
    expect(describeAhead({ ...initial, moves: puzzle }, undefined)).toBe(words.describe.thinking);
    expect(describeAhead({ ...initial, moves: [...puzzle, 3, THREAT] }, undefined)).toBe(
      words.status.youWon,
    );
    const after = [...puzzle, THREAT];
    const frame = frameFor(puzzle, DEFAULT_FUTURES);
    expect(describeAhead({ ...initial, moves: after }, frame)).toMatch(/far-right column/);
    expect(fromMoves(after).turn).toBe(YOU);
  }, 20_000);
});

describe("thinking ahead: in the lesson", () => {
  let lessons = 0;
  const renderLesson = () =>
    render(
      <ModuleShell
        lesson={{ ...valleyLesson, id: `thinking-ahead-${(lessons += 1)}` }}
        module={definition}
      />,
    );
  const scene = () => screen.getByTestId("thinking-ahead");

  it("drops your disc at once and answers with its own after thinking", async () => {
    mockReducedMotion(true);
    renderLesson();
    const column = scene().querySelector("[data-column='3']") as HTMLElement;
    await userEvent.click(column);
    expect(scene().getAttribute("data-moves")).toMatch(/^3/);
    await waitFor(() => expect(scene().getAttribute("data-moves")).toHaveLength(2), {
      timeout: 10_000,
    });
    expect(scene().querySelector("[data-bloom]")).not.toBeNull();
  }, 15_000);

  it("says to wait when tapped while it thinks, and starts afresh on a dial change", async () => {
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: words.puzzle }));
    await userEvent.click(scene().querySelector("[data-column='0']") as HTMLElement);
    expect(scene().querySelector("[data-status]")?.textContent).toBe(words.status.wait);
    await waitFor(() => expect(Number(scene().getAttribute("data-games"))).toBeGreaterThan(0));
    const dial = screen.getAllByRole("slider", { name: words.futures.label })[0] as HTMLElement;
    act(() => dial.focus());
    await userEvent.keyboard("{ArrowLeft}");
    // A clean search for the new setting: it counts up again from the start, never past its total.
    await waitFor(() => expect(scene().getAttribute("data-thinking")).toBe("done"), {
      timeout: 10_000,
    });
    expect(Number(scene().getAttribute("data-games"))).toBe(FUTURES[DEFAULT_FUTURES - 1]);
  }, 15_000);

  it("earns the star when the one-move-ahead player misses your slant", async () => {
    mockReducedMotion(true);
    renderLesson();
    await userEvent.click(screen.getByRole("button", { name: "Skip the guess for now" }));
    const dial = screen.getAllByRole("slider", { name: words.futures.label })[0] as HTMLElement;
    act(() => dial.focus());
    await userEvent.keyboard("{Home}");
    await userEvent.click(screen.getByRole("button", { name: words.puzzle }));
    await waitFor(
      () => expect(scene().getAttribute("data-moves")).toHaveLength(PUZZLE.length + 1),
      {
        timeout: 10_000,
      },
    );
    // Keyboard: from the middle column, End reaches the far right, Enter drops.
    (scene().querySelector("[data-column='3']") as HTMLElement).focus();
    await userEvent.keyboard("{End}{Enter}");
    const dock = document.querySelector("[data-region=dock]") as HTMLElement;
    await waitFor(() => expect(within(dock).getByText("You earned a star.")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(scene().querySelector("[data-winning]")).not.toBeNull();
  }, 20_000);
});
