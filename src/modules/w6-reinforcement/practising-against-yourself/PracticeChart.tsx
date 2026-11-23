import { words } from "./captions";

const CHART = { width: 320, height: 90 };
const RANGE = { min: 0, max: 1 };

/** A line through the moments that have a value, each at its own place along the practice. */
function pathOf(values: readonly (number | null)[], step: number) {
  let path = "";
  values.forEach((value, index) => {
    if (value === null) return;
    const y = CHART.height - ((value - RANGE.min) / (RANGE.max - RANGE.min)) * CHART.height;
    path += `${path ? "L" : "M"}${(index * step).toFixed(2)} ${y.toFixed(2)}`;
  });
  return path;
}

/**
 * Pip's wins against Pop (solid) and against the newcomer (dashed), over the practice so far,
 * on a scale that spans the whole practice (`moments` long), so the lines grow as it plays.
 */
export function PracticeChart({
  partner,
  newcomer,
  moments,
}: {
  /** Per moment; null before any game. */
  partner: readonly (number | null)[];
  newcomer: readonly number[];
  moments: number;
}) {
  const step = moments > 1 ? CHART.width / (moments - 1) : 0;
  return (
    <svg
      role="img"
      aria-label={words.chart.picture}
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      preserveAspectRatio="none"
      className="h-24 w-full"
      data-chart
    >
      <line
        x1={0}
        y1={CHART.height}
        x2={CHART.width}
        y2={CHART.height}
        stroke="var(--color-hairline)"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={0}
        y1={CHART.height / 2}
        x2={CHART.width}
        y2={CHART.height / 2}
        stroke="var(--color-ink-soft)"
        strokeOpacity={0.6}
        strokeDasharray="1 4"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={pathOf(newcomer, step)}
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth={2}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
        data-line="newcomer"
      />
      <path
        d={pathOf(partner, step)}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        data-line="partner"
      />
    </svg>
  );
}
