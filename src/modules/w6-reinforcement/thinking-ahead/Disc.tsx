import { YOU } from "./model";

/** A disc's radius on the board, in board units. */
export const RADIUS = 7.5;

/** A disc, told apart by its mark as well as its colour: yours has a ring, its has a cross. */
export function Disc({
  player,
  x,
  y,
  r = RADIUS,
}: {
  player: number;
  x: number;
  y: number;
  r?: number;
}) {
  if (player === YOU)
    return (
      <g data-disc="you">
        <circle
          cx={x}
          cy={y}
          r={r}
          fill="var(--color-flow)"
          stroke="var(--color-ink)"
          strokeWidth={1}
        />
        <circle cx={x} cy={y} r={r * 0.5} fill="none" stroke="var(--color-ink)" strokeWidth={1.2} />
      </g>
    );
  const arm = r * 0.45;
  return (
    <g data-disc="it">
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="var(--color-ink)"
        stroke="var(--color-ink)"
        strokeWidth={1}
      />
      <path
        d={`M${x - arm} ${y - arm}L${x + arm} ${y + arm}M${x + arm} ${y - arm}L${x - arm} ${y + arm}`}
        stroke="var(--color-paper)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  );
}
