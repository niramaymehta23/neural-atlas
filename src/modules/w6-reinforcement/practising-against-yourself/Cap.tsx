/** A player's mark, by shape as well as colour: Pip's sticks have round tops, Pop's square. */
export function Cap({
  player,
  x,
  y,
  size = 2.8,
}: {
  player: 0 | 1;
  x: number;
  y: number;
  size?: number;
}) {
  return player === 0 ? (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill="var(--color-flow)"
      stroke="var(--color-ink)"
      strokeWidth={0.6}
    />
  ) : (
    <rect
      x={x - size}
      y={y - size}
      width={size * 2}
      height={size * 2}
      fill="var(--color-ink)"
      stroke="var(--color-ink)"
      strokeWidth={0.6}
    />
  );
}
