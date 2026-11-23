/**
 * Connect Four: seven columns, six rows; discs drop to the lowest free hole of a column, and four
 * of one player's discs in a line (across, up or on a slant) win. Player 1 moves first. A game is
 * its list of columns; `fromMoves` rebuilds the board from that list, so the list is all a link
 * needs. Pure; `drop` and `lift` change a board in place (fast enough for thousands of imagined
 * games), and everything else leaves its argument alone.
 */
export const COLUMNS = 7;
export const ROWS = 6;
export const CELLS = COLUMNS * ROWS;
/** Columns from the middle outwards: where a player with no better idea drops first. */
export const MIDDLE_FIRST = [3, 2, 4, 1, 5, 0, 6] as const;

export type Player = 1 | 2;
/** 0 while the game goes on, the winner, or "draw" when the board is full. */
export type Outcome = 0 | Player | "draw";

export type Board = {
  /** Row by row from the bottom: `cells[row * COLUMNS + column]` is 0 (empty), 1 or 2. */
  cells: Int8Array;
  /** Discs in each column. */
  heights: Int8Array;
  /** Whose turn it is. */
  turn: Player;
  /** Discs on the board. */
  count: number;
  outcome: Outcome;
};

export const other = (player: Player): Player => (player === 1 ? 2 : 1);

export function emptyBoard(): Board {
  return {
    cells: new Int8Array(CELLS),
    heights: new Int8Array(COLUMNS),
    turn: 1,
    count: 0,
    outcome: 0,
  };
}

export const copyBoard = (board: Board): Board => ({
  cells: board.cells.slice(),
  heights: board.heights.slice(),
  turn: board.turn,
  count: board.count,
  outcome: board.outcome,
});

export const cellAt = (board: Board, column: number, row: number) =>
  column < 0 || column >= COLUMNS || row < 0 || row >= ROWS
    ? -1
    : (board.cells[row * COLUMNS + column] ?? -1);

/** True when a disc can still go in `column` of a game that is not over. */
export const canDrop = (board: Board, column: number) =>
  board.outcome === 0 &&
  Number.isInteger(column) &&
  column >= 0 &&
  column < COLUMNS &&
  (board.heights[column] ?? ROWS) < ROWS;

/** Every column a disc can go in, left to right. */
export function openColumns(board: Board): number[] {
  const open: number[] = [];
  for (let column = 0; column < COLUMNS; column += 1) if (canDrop(board, column)) open.push(column);
  return open;
}

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

/** Discs of `player` in a line through (column, row) along (dc, dr), the disc itself included. */
function lineLength(
  board: Board,
  column: number,
  row: number,
  dc: number,
  dr: number,
  player: number,
) {
  let length = 1;
  for (const sign of [1, -1]) {
    let c = column + dc * sign;
    let r = row + dr * sign;
    while (cellAt(board, c, r) === player) {
      length += 1;
      c += dc * sign;
      r += dr * sign;
    }
  }
  return length;
}

/** True when the disc at (column, row) is part of four or more in a line. */
export function winsAt(board: Board, column: number, row: number): boolean {
  const player = cellAt(board, column, row);
  if (player <= 0) return false;
  return DIRECTIONS.some(([dc, dr]) => lineLength(board, column, row, dc, dr, player) >= 4);
}

/**
 * Drops the turn player's disc in `column`, in place, and passes the turn. The column must be
 * open (`canDrop`). Returns the board.
 */
export function drop(board: Board, column: number): Board {
  const row = board.heights[column] ?? 0;
  const player = board.turn;
  board.cells[row * COLUMNS + column] = player;
  board.heights[column] = row + 1;
  board.count += 1;
  board.turn = other(player);
  if (winsAt(board, column, row)) board.outcome = player;
  else if (board.count === CELLS) board.outcome = "draw";
  return board;
}

/** Takes the top disc back out of `column`, in place: the exact undo of the `drop` before it. */
export function lift(board: Board, column: number): Board {
  const row = (board.heights[column] ?? 1) - 1;
  board.cells[row * COLUMNS + column] = 0;
  board.heights[column] = row;
  board.count -= 1;
  board.turn = other(board.turn);
  board.outcome = 0;
  return board;
}

/** A new board with the turn player's disc in `column`. */
export const play = (board: Board, column: number): Board => drop(copyBoard(board), column);

/** True when the turn player would win by dropping in `column`. */
export function winsWith(board: Board, column: number): boolean {
  if (!canDrop(board, column)) return false;
  drop(board, column);
  const won = board.outcome !== 0 && board.outcome !== "draw";
  lift(board, column);
  return won;
}

/**
 * The legal start of a list of columns: moves stop at the first one that is not a whole number,
 * goes in a full column or comes after the game ended. Links use this to stay playable.
 */
export function legalMoves(moves: readonly unknown[]): number[] {
  const board = emptyBoard();
  const kept: number[] = [];
  for (const move of moves) {
    if (typeof move !== "number" || !canDrop(board, move)) break;
    drop(board, move);
    kept.push(move);
  }
  return kept;
}

/** The board a list of legal moves leads to (see `legalMoves`). */
export function fromMoves(moves: readonly number[]): Board {
  const board = emptyBoard();
  for (const move of moves) {
    if (!canDrop(board, move)) break;
    drop(board, move);
  }
  return board;
}

/** The four (or more) holes of a won game's winning line, as [column, row] pairs; [] otherwise. */
export function winningLine(board: Board): [number, number][] {
  if (board.outcome === 0 || board.outcome === "draw") return [];
  for (let row = 0; row < ROWS; row += 1)
    for (let column = 0; column < COLUMNS; column += 1) {
      const player = cellAt(board, column, row);
      if (player !== board.outcome) continue;
      for (const [dc, dr] of DIRECTIONS) {
        // Start only at a line's first disc, so each line is found once.
        if (cellAt(board, column - dc, row - dr) === player) continue;
        const line: [number, number][] = [];
        let c = column;
        let r = row;
        while (cellAt(board, c, r) === player) {
          line.push([c, r]);
          c += dc;
          r += dr;
        }
        if (line.length >= 4) return line;
      }
    }
  return [];
}

/** Columns where the turn player's opponent would win if it were their turn: threats to block. */
export function threatsAgainst(board: Board): number[] {
  if (board.outcome !== 0) return [];
  const flipped = copyBoard(board);
  flipped.turn = other(board.turn);
  return openColumns(flipped).filter((column) => winsWith(flipped, column));
}
