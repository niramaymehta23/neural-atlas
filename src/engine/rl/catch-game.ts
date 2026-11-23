/**
 * Catch the fruit: a tiny arcade game on a flat grid. A fruit drops straight down from the top
 * row, one row per move; the basket on the bottom row moves left, stays or moves right. A catch
 * pays +1, a miss −1, every other move nothing. Small on purpose, so a network learns it in a few
 * hundred games in a browser worker. Pure.
 */
import type { Random } from "../random";

export const CATCH_COLUMNS = 5;
export const CATCH_ROWS = 5;
/** Left, stay, right. */
export const BASKET_MOVES = [-1, 0, 1] as const;
export const BASKET_MOVE_COUNT = BASKET_MOVES.length;

export type Drop = { fruitRow: number; fruitColumn: number; basket: number };

export type CatchOutcome = { next: Drop; reward: number; done: boolean; caught: boolean };

/** A new drop: the fruit in the top row and the basket anywhere, both by `random`. */
export const randomDrop = (random: Random): Drop => ({
  fruitRow: 0,
  fruitColumn: random.int(CATCH_COLUMNS),
  basket: random.int(CATCH_COLUMNS),
});

/** Every way a drop can begin (fruit column × basket column), for a fair test. */
export const EVERY_DROP: readonly Drop[] = Array.from(
  { length: CATCH_COLUMNS * CATCH_COLUMNS },
  (_, at) => ({
    fruitRow: 0,
    fruitColumn: Math.floor(at / CATCH_COLUMNS),
    basket: at % CATCH_COLUMNS,
  }),
);

/** One move: the basket shifts (the edges stop it), then the fruit falls a row. */
export function moveBasket(drop: Drop, move: number): CatchOutcome {
  const shift = BASKET_MOVES[move] ?? 0;
  const basket = Math.min(CATCH_COLUMNS - 1, Math.max(0, drop.basket + shift));
  const next = { fruitRow: drop.fruitRow + 1, fruitColumn: drop.fruitColumn, basket };
  if (next.fruitRow < CATCH_ROWS - 1) return { next, reward: 0, done: false, caught: false };
  const caught = basket === drop.fruitColumn;
  return { next, reward: caught ? 1 : -1, done: true, caught };
}

/** How many inputs the network reads: where the fruit is (column, row) and where the basket is. */
export const CATCH_INPUTS = CATCH_COLUMNS + CATCH_ROWS + CATCH_COLUMNS;

/** The drop as the network reads it: three one-hot groups. */
export function catchInputs(drop: Drop): Float64Array {
  const input = new Float64Array(CATCH_INPUTS);
  input[drop.fruitColumn] = 1;
  input[CATCH_COLUMNS + drop.fruitRow] = 1;
  input[CATCH_COLUMNS + CATCH_ROWS + drop.basket] = 1;
  return input;
}

/** Plays one drop to the end with `choose`; returns every position on the way and the catch. */
export function playDrop(
  start: Drop,
  choose: (drop: Drop) => number,
): { positions: Drop[]; caught: boolean } {
  const positions = [start];
  let drop = start;
  for (;;) {
    const outcome = moveBasket(drop, choose(drop));
    positions.push(outcome.next);
    drop = outcome.next;
    if (outcome.done) return { positions, caught: outcome.caught };
  }
}

/**
 * The chance a basket that moves at random catches the fruit, worked out exactly over every start
 * and every sequence of moves.
 */
export function randomCatchChance(): number {
  const chance = (drop: Drop): number => {
    let total = 0;
    for (let move = 0; move < BASKET_MOVE_COUNT; move += 1) {
      const outcome = moveBasket(drop, move);
      total += outcome.done ? (outcome.caught ? 1 : 0) : chance(outcome.next);
    }
    return total / BASKET_MOVE_COUNT;
  };
  return EVERY_DROP.reduce((sum, drop) => sum + chance(drop), 0) / EVERY_DROP.length;
}
