import { createRandom } from "@/engine/random";
import { MOVE_COUNT, MOVES, reachable, type Tile, type World } from "@/engine/rl/gridworld";
import { bestMove, createQRunner, squareValue, type QRunner } from "@/engine/rl/q-learning";
import { theatreCaptions as words } from "./captions";
import { valueColour, type Painter, type Show } from "./painter";

const COLUMNS = 9;
const ROWS = 6;
const BOARD_SECONDS = 75;
/** It starts at a walk and hurries up, so both the first try and the last hundred can be seen. */
const PACE = { first: 5, last: 140, growSeconds: 30 };
const MOST_MOVES = 150;
/** How quickly the drawn piece catches up with the real one, per second. */
const GLIDE = 14;

/** A seeded board with walls and lava, whose bowl can be reached. */
export function makeBoard(seed: number): World {
  const random = createRandom(seed);
  const start = COLUMNS * (ROWS - 1);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const tiles: Tile[] = Array.from({ length: COLUMNS * ROWS }, () => {
      const roll = random.next();
      return roll < 0.16 ? "wall" : roll < 0.24 ? "trap" : "floor";
    });
    tiles[start] = "floor";
    tiles[COLUMNS - 1] = "goal";
    const world: World = { columns: COLUMNS, rows: ROWS, tiles, start };
    if (reachable(world)) return world;
  }
  const open: Tile[] = Array.from({ length: COLUMNS * ROWS }, () => "floor");
  open[COLUMNS - 1] = "goal";
  return { columns: COLUMNS, rows: ROWS, tiles: open, start };
}

/** An explorer learning board after board by trying. */
export function createExplorerShow(seed = 1): Show {
  let board = 0;
  let world = makeBoard(seed);
  let runner: QRunner;
  let clock = 0;
  let owed = 0;
  let shown = { column: 0, row: 0 };

  const begin = () => {
    world = makeBoard(seed + (board % 500));
    runner = createQRunner(
      world,
      { curiosity: 0.2, learnRate: 0.35, lookAhead: 0.95 },
      seed + board,
    );
    board += 1;
    clock = 0;
    owed = 0;
    shown = { column: world.start % COLUMNS, row: Math.floor(world.start / COLUMNS) };
    return runner;
  };
  runner = begin();

  return {
    advance(seconds) {
      clock += seconds;
      if (clock >= BOARD_SECONDS) begin();
      const pace =
        PACE.first + (PACE.last - PACE.first) * Math.min(1, clock / PACE.growSeconds) ** 2;
      owed = Math.min(owed + seconds * pace, MOST_MOVES);
      const moves = Math.floor(owed);
      owed -= moves;
      if (moves > 0) runner.advance(moves);
      const column = runner.position % COLUMNS;
      const row = Math.floor(runner.position / COLUMNS);
      const step = Math.min(1, seconds * GLIDE);
      shown = {
        column: shown.column + (column - shown.column) * step,
        row: shown.row + (row - shown.row) * step,
      };
    },
    draw({ context, width, height, palette, shapes }: Painter) {
      const size = Math.min((width * 0.84) / COLUMNS, (height * 0.74) / ROWS);
      const left = (width - size * COLUMNS) / 2;
      const top = (height - size * ROWS) / 2;
      const inset = size * 0.05;
      const tile = size - inset * 2;
      let most = 0.05;
      for (let cell = 0; cell < world.tiles.length; cell += 1)
        most = Math.max(most, Math.abs(squareValue(runner.q, cell)));
      world.tiles.forEach((kind, cell) => {
        const x = left + (cell % COLUMNS) * size + inset;
        const y = top + Math.floor(cell / COLUMNS) * size + inset;
        const value = squareValue(runner.q, cell) / most;
        context.fillStyle = kind === "floor" ? valueColour(palette, value) : palette.tiles[kind];
        context.beginPath();
        context.roundRect(x, y, tile, tile, size * 0.14);
        context.fill();
        context.strokeStyle = palette.hairline;
        context.lineWidth = 1;
        context.stroke();
        const mark = shapes.tiles.get(kind);
        if (mark) {
          context.save();
          context.translate(x, y);
          context.scale(tile, tile);
          context.strokeStyle = palette.ink;
          context.lineWidth = 1.5 / tile;
          context.stroke(mark);
          context.restore();
        }
        if (kind !== "floor") return;
        let lean = 0;
        for (let move = 0; move < MOVE_COUNT; move += 1)
          lean = Math.max(lean, Math.abs(runner.q[cell * MOVE_COUNT + move] ?? 0));
        if (lean < 0.01) return;
        const [dRow, dColumn] = MOVES[bestMove(runner.q, cell)] ?? MOVES[0];
        const middle = { x: x + tile / 2, y: y + tile / 2 };
        const reach = tile * 0.16 + tile * 0.2 * Math.min(1, Math.abs(value));
        const side = tile * 0.07;
        context.fillStyle = palette.ink;
        context.globalAlpha = 0.65;
        context.beginPath();
        context.moveTo(middle.x - dRow * side, middle.y + dColumn * side);
        context.lineTo(middle.x + dColumn * reach, middle.y + dRow * reach);
        context.lineTo(middle.x + dRow * side, middle.y - dColumn * side);
        context.fill();
        context.globalAlpha = 1;
      });
      const x = left + (shown.column + 0.5) * size;
      const y = top + (shown.row + 0.5) * size;
      context.beginPath();
      context.arc(x, y, size * 0.2, 0, Math.PI * 2);
      context.fillStyle = palette.accent;
      context.fill();
      context.strokeStyle = palette.ink;
      context.lineWidth = 2.5;
      context.stroke();
    },
    describe: () => words.now.explorer,
  };
}
