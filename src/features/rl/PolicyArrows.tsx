import { MOVES } from "@/engine/rl/gridworld";
import type { Square } from "@/visuals/Board";

/** Shares below this draw no wedge at all, so a square with no real lean stays calm. */
export const LEAN_FROM = 0.01;

type PolicyArrowsProps = {
  square: Square;
  /**
   * How strongly each move (up, right, down, left) is favoured, 0–1 on one scale shared by the
   * whole board: chances of taking it, or scores rescaled. Longer wedges for bigger shares.
   */
  shares: readonly number[];
  /** The favourite move, drawn in full ink; −1 for none. */
  best: number;
};

/**
 * Four small wedges over a board square, one per move, longer for the moves the learner leans
 * towards, the favourite in ink and the others softer: the "arrow field" of a policy. Lengths
 * carry the meaning, so it reads without colour. Draw it through `Board`'s `overlay`.
 */
export function PolicyArrows({ square, shares, best }: PolicyArrowsProps) {
  if (shares.every((share) => !(share >= LEAN_FROM))) return null;
  const middle = { x: square.x + square.size / 2, y: square.y + square.size / 2 };
  return (
    <>
      {MOVES.map(([dRow, dColumn], move) => {
        const share = Math.min(1, Math.max(0, shares[move] ?? 0));
        if (share < LEAN_FROM && move !== best) return null;
        const reach = 4 + share * (square.size / 2 - 8);
        const tip = { x: middle.x + dColumn * reach, y: middle.y + dRow * reach };
        const side = { x: -dRow * 3, y: dColumn * 3 };
        return (
          <path
            key={move}
            data-arrow={move === best ? "best" : "other"}
            data-reach={reach.toFixed(1)}
            d={`M${middle.x + side.x} ${middle.y + side.y} L${tip.x} ${tip.y} L${middle.x - side.x} ${middle.y - side.y} Z`}
            fill={move === best ? "var(--color-ink)" : "var(--color-ink-soft)"}
            fillOpacity={move === best ? 0.85 : 0.6}
          />
        );
      })}
    </>
  );
}
