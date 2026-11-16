import { extent, linePath } from "@/design/encodings";

export type ChartSeries = {
  values: readonly number[];
  /** The previous run, drawn faint and dashed beside the current one. */
  ghost?: boolean;
};

type ChartProps = {
  series: readonly ChartSeries[];
  /** Plain description, such as "Mistakes shrinking as it practises". */
  label: string;
  /** Index to mark (the timeline's current moment). */
  marker?: number;
  width?: number;
  height?: number;
  className?: string;
};

/** A quiet line chart with no numbers: the shape is the message. All series share one scale; it stretches to its box. */
export function Chart({
  series,
  label,
  marker,
  width = 320,
  height = 120,
  className = "",
}: ChartProps) {
  const range = extent(series.flatMap(({ values }) => values));
  const longest = Math.max(1, ...series.map(({ values }) => values.length));
  const step = longest > 1 ? width / (longest - 1) : 0;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={height}
        stroke="var(--color-hairline)"
        vectorEffect="non-scaling-stroke"
      />
      {series.map(({ values, ghost }, index) => (
        <path
          key={index}
          d={linePath(values, step * Math.max(0, values.length - 1), height, range)}
          fill="none"
          stroke={ghost ? "var(--color-ink-soft)" : "var(--color-ink)"}
          strokeOpacity={ghost ? 0.5 : 1}
          strokeDasharray={ghost ? "4 4" : undefined}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {marker !== undefined && (
        <line
          x1={marker * step}
          x2={marker * step}
          y1={0}
          y2={height}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
