/** How many dots a team gets right, as a bar with a notch at the goal. */
export function ScoreBar({ right, goal, label }: { right: number; goal: number; label: string }) {
  const share = Math.round(Math.min(1, Math.max(0, right)) * 100);
  const notch = `${goal * 100}%`;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={share}
      className="relative h-4 w-full overflow-hidden rounded-pill border border-ink-soft bg-paper"
    >
      {/* The width and the notch follow numbers, so they cannot be classes. */}
      <div className="h-full bg-ink-soft" style={{ width: `${share}%` }} />
      <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: notch }} />
    </div>
  );
}
