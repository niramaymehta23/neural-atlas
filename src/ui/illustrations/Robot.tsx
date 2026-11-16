type RobotProps = {
  className?: string;
  /** Accessible name; the robot is the learner the stories follow. */
  title?: string;
};

/**
 * The robot learner, cut from paper: flat shapes with slightly uneven edges, a darker paper layer
 * peeking out behind for depth, and no glow.
 */
export function Robot({ className = "size-40", title = "Robot learner" }: RobotProps) {
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={title} className={className}>
      {/* Back layer: the same silhouette, nudged, reads as a second sheet of paper. */}
      <g transform="translate(3 4)" className="fill-hairline">
        <path d="M44 64c1-12 9-19 21-20l31-1c13 0 21 8 22 20l1 29c0 12-8 20-20 21l-35 1c-12 0-19-8-20-20z" />
        <path d="M38 118c2-6 8-9 15-9h54c7 0 12 4 14 10l3 21c1 5-3 9-8 9H44c-5 0-9-4-8-9z" />
      </g>
      {/* Antenna */}
      <path
        d="M79 44c-1-7 0-14 1-20"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-ink-soft"
      />
      <path d="M80 13c5 0 9 4 9 9s-4 8-9 8-9-3-9-8 4-9 9-9z" className="fill-accent" />
      {/* Body */}
      <path
        d="M38 118c2-6 8-9 15-9h54c7 0 12 4 14 10l3 21c1 5-3 9-8 9H44c-5 0-9-4-8-9z"
        className="fill-sand"
      />
      <path
        d="M68 124c4-2 20-2 24 0 2 1 2 5 0 6-4 2-20 2-24 0-2-1-2-5 0-6z"
        className="fill-flow"
      />
      {/* Head */}
      <path
        d="M44 64c1-12 9-19 21-20l31-1c13 0 21 8 22 20l1 29c0 12-8 20-20 21l-35 1c-12 0-19-8-20-20z"
        className="fill-sand"
      />
      <path
        d="M55 70c0-6 4-9 10-9l30-1c6 0 10 4 10 10v15c0 6-4 10-10 10l-30 1c-6 0-10-4-10-10z"
        className="fill-card"
      />
      {/* Eyes and a small smile */}
      <path d="M69 74c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z" className="fill-ink" />
      <path d="M92 74c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z" className="fill-ink" />
      <path
        d="M74 89c4 3 9 3 13 0"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-ink"
      />
      {/* Cheeks */}
      <path d="M60 86c2 0 4 1 4 3s-2 3-4 3-4-1-4-3 2-3 4-3z" className="fill-bad opacity-40" />
      <path d="M101 86c2 0 4 1 4 3s-2 3-4 3-4-1-4-3 2-3 4-3z" className="fill-bad opacity-40" />
      {/* Ears */}
      <path
        d="M38 76c3-1 6 1 6 4v10c0 3-3 5-6 4-3 0-4-3-4-6v-7c0-3 1-5 4-5z"
        className="fill-ink-soft"
      />
      <path
        d="M122 76c3 0 4 2 4 5v7c0 3-1 6-4 6-3 1-6-1-6-4V80c0-3 3-5 6-4z"
        className="fill-ink-soft"
      />
    </svg>
  );
}
