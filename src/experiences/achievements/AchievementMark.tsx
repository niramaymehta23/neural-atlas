import { STAR_PATH } from "./star-path";

/** A five-pointed star: filled once earned, an outline before (the shape of the fill, not only its colour). */
export function AchievementMark({ earned, className }: { earned: boolean; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} aria-hidden>
      <path
        d={STAR_PATH}
        fill={earned ? "var(--color-accent)" : "none"}
        stroke={earned ? "var(--color-accent-ink)" : "var(--color-ink-soft)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
