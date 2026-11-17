import { classMark, classTone, markPath } from "@/design/encodings";

type GroupMarkProps = {
  group: number;
  /** Size in px when drawn on its own, as a swatch or legend key. */
  size?: number;
};

/** A group's swatch on its own: its shape in its tone, outlined in ink, as drawn in the garden. */
export function GroupMark({ group, size = 14 }: GroupMarkProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden data-shape={classMark(group)}>
      <path
        d={markPath(classMark(group), 8, 8, 5.5)}
        fill={classTone(group)}
        stroke="var(--color-ink)"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
