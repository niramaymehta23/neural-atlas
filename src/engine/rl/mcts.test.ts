import { createRandom } from "../random";
import { drop, emptyBoard, fromMoves, openColumns, type Board, type Player } from "./connect-four";
import { createSearch, oneMoveAhead, think, type SearchSettings } from "./mcts";

/** Imagined games per move and how long each runs, as the lesson starts. */
const DEFAULT: SearchSettings = { games: 3000, length: 42 };

/** Plays `count` games of `settings` against a random player, sides alternating; returns wins. */
function winsAgainstRandom(settings: SearchSettings, count: number, seed: number) {
  const random = createRandom(seed);
  let wins = 0;
  for (let game = 0; game < count; game += 1) {
    const board = emptyBoard();
    const side: Player = game % 2 === 0 ? 1 : 2;
    while (board.outcome === 0) {
      if (board.turn === side)
        drop(board, think(board, settings, seed * 1000 + game * 50 + board.count));
      else {
        const open = openColumns(board);
        drop(board, open[random.int(open.length)] ?? 0);
      }
    }
    if (board.outcome === side) wins += 1;
  }
  return wins;
}

/** A random player against a random player, for the baseline. */
function randomAgainstRandom(count: number, seed: number) {
  const random = createRandom(seed);
  let wins = 0;
  for (let game = 0; game < count; game += 1) {
    const board = emptyBoard();
    const side: Player = game % 2 === 0 ? 1 : 2;
    while (board.outcome === 0) {
      const open = openColumns(board);
      drop(board, open[random.int(open.length)] ?? 0);
    }
    if (board.outcome === side) wins += 1;
  }
  return wins;
}

const visits = (board: Board, settings: SearchSettings, seed: number) => {
  const search = createSearch(board, settings, seed);
  search.step(search.total);
  return search.bloom().map(({ column, visits: count }) => [column, count]);
};

describe("thinking ahead (MCTS)", () => {
  it("MCTS (seed 1, 20 games, 3000 imagined games per move) wins at least 19 of 20 against a random player", () => {
    // Measured: 20 of 20. A random player wins about half (below).
    expect(winsAgainstRandom(DEFAULT, 20, 1)).toBeGreaterThanOrEqual(19);
    const baseline = randomAgainstRandom(200, 1);
    expect(baseline).toBeGreaterThan(70);
    expect(baseline).toBeLessThan(130);
  }, 60_000);

  it("imagines exactly the same games however the work is sliced", () => {
    const board = fromMoves([3, 3, 2]);
    const whole = createSearch(board, { games: 500, length: 42 }, 7);
    whole.step(500);
    const sliced = createSearch(board, { games: 500, length: 42 }, 7);
    while (!sliced.finished) sliced.step(3);
    expect(sliced.done).toBe(500);
    expect(sliced.bloom()).toEqual(whole.bloom());
    expect(sliced.choice()).toBe(whole.choice());
    // It never imagines more than asked, and a finished search does nothing more.
    expect(sliced.step(10)).toBe(0);
  });

  it("is the same for the same seed and differs for another", () => {
    const board = fromMoves([3]);
    expect(visits(board, { games: 300, length: 42 }, 1)).toEqual(
      visits(board, { games: 300, length: 42 }, 1),
    );
    expect(visits(board, { games: 300, length: 42 }, 1)).not.toEqual(
      visits(board, { games: 300, length: 42 }, 2),
    );
  });

  it("takes a win when it has one, and blocks one it can see coming", () => {
    // Player 2 to move with three of its own up column 6 and nothing to fear.
    expect(think(fromMoves([0, 6, 1, 6, 0, 6, 5]), DEFAULT, 1)).toBe(6);
    // Player 2 to move; player 1 threatens column 0.
    expect(think(fromMoves([0, 6, 0, 5, 0]), DEFAULT, 1)).toBe(0);
  });

  it("puts most of its imagining into the move that matters", () => {
    const search = createSearch(fromMoves([0, 6, 0, 5, 0]), DEFAULT, 1);
    search.step(search.total);
    const branches = search.bloom();
    const total = branches.reduce((sum, branch) => sum + branch.visits, 0);
    expect(total).toBe(DEFAULT.games);
    const block = branches.find(({ column }) => column === 0);
    expect((block?.visits ?? 0) / total).toBeGreaterThan(0.5);
    // Three levels: its moves, your replies, its answers.
    expect(block?.children.length).toBeGreaterThan(0);
    expect(block?.children[0]?.children.length).toBeGreaterThan(0);
  });

  it("looking one move ahead checks only its own next move", () => {
    // It takes a win at once...
    expect(oneMoveAhead(fromMoves([0, 6, 1, 6, 0, 6, 5]))).toBe(6);
    // ...but never imagines your reply, so it drops in the middle instead of blocking.
    const board = fromMoves([0, 6, 0, 5, 0]);
    expect(oneMoveAhead(board)).toBe(3);
    const look = createSearch(board, { games: 0, length: 42 }, 1);
    expect(look.total).toBe(7);
    look.step(2);
    expect(look.done).toBe(2);
    look.step(99);
    expect(look.finished).toBe(true);
    expect(look.choice()).toBe(3);
    expect(
      look.bloom().every((branch) => branch.visits === 1 && branch.children.length === 0),
    ).toBe(true);
  });

  it("has nothing to think about once the game is over", () => {
    const over = fromMoves([0, 1, 0, 1, 0, 1, 0]);
    const search = createSearch(over, DEFAULT, 1);
    expect(search.total).toBe(0);
    expect(search.finished).toBe(true);
    expect(search.choice()).toBe(-1);
    expect(oneMoveAhead(over)).toBe(-1);
  });
});
