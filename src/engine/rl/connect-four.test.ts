import {
  canDrop,
  drop,
  emptyBoard,
  fromMoves,
  legalMoves,
  lift,
  openColumns,
  play,
  threatsAgainst,
  winningLine,
  winsWith,
} from "./connect-four";

describe("connect four", () => {
  it("drops discs to the lowest free hole, taking turns", () => {
    const board = fromMoves([3, 3, 4]);
    expect(Array.from(board.heights)).toEqual([0, 0, 0, 2, 1, 0, 0]);
    expect(board.cells[3]).toBe(1);
    expect(board.cells[3 + 7]).toBe(2);
    expect(board.cells[4]).toBe(1);
    expect(board.turn).toBe(2);
    expect(board.count).toBe(3);
  });

  it("finds four in a row across, up and on both slants", () => {
    expect(fromMoves([0, 0, 1, 1, 2, 2, 3]).outcome).toBe(1);
    expect(fromMoves([0, 1, 0, 1, 0, 1, 0]).outcome).toBe(1);
    // A rising slant for player 1: (0,0) (1,1) (2,2) (3,3).
    const rising = fromMoves([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    expect(rising.outcome).toBe(1);
    expect(winningLine(rising)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    // A falling slant for player 2: (3,0) (2,1) (1,2) (0,3).
    const falling = fromMoves([6, 3, 2, 2, 1, 1, 0, 1, 0, 0, 6, 0]);
    expect(falling.outcome).toBe(2);
    expect(winningLine(falling)).toHaveLength(4);
  });

  it("calls a full board with no line a draw", () => {
    // A seeded random game that happened to fill the board.
    const moves = [
      5, 1, 0, 4, 3, 4, 1, 3, 3, 3, 3, 4, 2, 1, 5, 5, 2, 1, 4, 6, 6, 5, 3, 0, 2, 5, 1, 4, 1, 0, 4,
      6, 0, 0, 5, 2, 0, 6, 2, 2, 6, 6,
    ];
    const board = fromMoves(moves);
    expect(board.count).toBe(42);
    expect(board.outcome).toBe("draw");
    expect(winningLine(board)).toEqual([]);
    expect(openColumns(board)).toEqual([]);
  });

  it("stops a list at the first move that cannot be played", () => {
    expect(legalMoves([0, 0, 0, 0, 0, 0, 0, 1])).toEqual([0, 0, 0, 0, 0, 0]);
    expect(legalMoves([1, 9, 2])).toEqual([1]);
    expect(legalMoves([1, 1.5, 2])).toEqual([1]);
    expect(legalMoves(["2", 1])).toEqual([]);
    // Nothing after a win.
    expect(legalMoves([0, 1, 0, 1, 0, 1, 0, 1, 2])).toEqual([0, 1, 0, 1, 0, 1, 0]);
  });

  it("undoes a drop exactly with lift", () => {
    const board = fromMoves([3, 2, 3]);
    const before = { cells: Array.from(board.cells), turn: board.turn, count: board.count };
    drop(board, 5);
    lift(board, 5);
    expect({ cells: Array.from(board.cells), turn: board.turn, count: board.count }).toEqual(
      before,
    );
  });

  it("knows open columns, winning drops and threats without changing the board", () => {
    const board = fromMoves([0, 6, 0, 6, 0]);
    expect(openColumns(board)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(threatsAgainst(board)).toEqual([0]);
    expect(winsWith(board, 6)).toBe(false);
    const next = play(board, 1);
    expect(winsWith(next, 0)).toBe(true);
    expect(board.count).toBe(5);
    expect(canDrop(emptyBoard(), 7)).toBe(false);
  });
});
