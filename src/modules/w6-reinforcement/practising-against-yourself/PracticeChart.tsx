import { linePath } from "@/design/encodings";
import { words } from "./captions";

const CHART = { width: 320, height: 90 };
const RANGE = { min: 0, max: 1 };

/** Pip's wins against Pop (solid) and against the newcomer (dashed), over the practice so far. */
export function PracticeChart({
  partner,
  newcomer,
}: {
  partner: readonly number[];
  newcomer: readonly number[];
}) {
  const longest = Math.max(1, partner.length, newcomer.length);
  const widthOf = (values: readonly number[]) =>
    longest > 1 ? (CHART.width * Math.max(0, values.length - 1)) / (longest - 1) : 0;
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
        d={linePath(newcomer, widthOf(newcomer), CHART.height, RANGE)}
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth={2}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
        data-line="newcomer"
      />
      <path
        d={linePath(partner, widthOf(partner), CHART.height, RANGE)}
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
