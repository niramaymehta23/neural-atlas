/** The words the strip speaks; each lesson passes them from its captions. */
export type StripWords = {
  /** What the strip is, for screen readers. */
  label: string;
  /** A layer's name under its histogram: "Layer two". */
  layer: (index: number) => string;
  /** Beside a layer whose cells all say nothing. */
  silent: string;
  /** Beside a layer whose cells are all pinned at the ends. */
  stuck: string;
};

type ActivationStripProps = {
  /** Per hidden layer, everything its cells said (every cell, every example). */
  layers: readonly ArrayLike<number>[];
  /** The span of values the histograms cover; values outside count at the ends. */
  range: { min: number; max: number };
  words: StripWords;
  bins?: number;
};

const BIN_WIDTH = 6;
const HEIGHT = 56;
/** A layer whose answers sit this close to zero counts as silent. */
const SILENT = 1e-6;
/** A layer with this share of answers in the end bins counts as stuck at the ends. */
const STUCK_SHARE = 0.9;

/** How many answers fall in each bin across `range` (the ends catch everything beyond). */
export function histogram(
  values: ArrayLike<number>,
  range: { min: number; max: number },
  bins: number,
) {
  const counts = new Array<number>(bins).fill(0);
  const span = range.max - range.min || 1;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    if (!Number.isFinite(value)) continue;
    const bin = Math.min(bins - 1, Math.max(0, Math.floor(((value - range.min) / span) * bins)));
    counts[bin] = (counts[bin] ?? 0) + 1;
  }
  return counts;
}

/** What a layer's answers look like: all silent, piled at the ends, or spread out. */
export function layerMood(
  values: ArrayLike<number>,
  range: { min: number; max: number },
  bins = 24,
) {
  let loud = false;
  for (let index = 0; index < values.length; index += 1)
    if (Math.abs(values[index] ?? 0) > SILENT) loud = true;
  if (values.length > 0 && !loud) return "silent" as const;
  const counts = histogram(values, range, bins);
  const ends = (counts[0] ?? 0) + (counts[bins - 1] ?? 0);
  return values.length > 0 && ends / values.length >= STUCK_SHARE
    ? ("stuck" as const)
    : ("spread" as const);
}

/**
 * The activation strip: one small histogram per layer of everything its cells said. A healthy
 * layer spreads out; a silent one is a single spike at zero; a stuck one piles up at the ends.
 * Those two are also named in words, so the strip never relies on shape alone.
 */
export function ActivationStrip({ layers, range, words, bins = 24 }: ActivationStripProps) {
  const width = bins * BIN_WIDTH;
  const zero =
    range.min < 0 && range.max > 0 ? ((0 - range.min) / (range.max - range.min)) * width : null;
  return (
    <figure className="flex flex-col gap-1" aria-label={words.label} data-activation-strip>
      <ol className="flex flex-wrap gap-3">
        {layers.map((values, index) => {
          const counts = histogram(values, range, bins);
          const most = Math.max(1, ...counts);
          const mood = layerMood(values, range, bins);
          return (
            <li
              key={index}
              className="flex flex-col items-center gap-1 text-xs"
              data-layer-mood={mood}
            >
              <svg
                viewBox={`0 0 ${width} ${HEIGHT}`}
                className="h-14 w-36 rounded-control border border-hairline bg-card"
                aria-hidden
              >
                {zero !== null && (
                  <line
                    x1={zero}
                    x2={zero}
                    y1={0}
                    y2={HEIGHT}
                    stroke="var(--color-hairline)"
                    strokeDasharray="2 3"
                  />
                )}
                {counts.map((value, bin) => {
                  // A square root keeps a tall spike from flattening everything else.
                  const tall = Math.sqrt(value / most) * (HEIGHT - 6);
                  return (
                    <rect
                      key={bin}
                      x={bin * BIN_WIDTH + 0.5}
                      y={HEIGHT - tall}
                      width={BIN_WIDTH - 1}
                      height={tall}
                      fill="var(--color-ink-soft)"
                    />
                  );
                })}
              </svg>
              <span>
                {words.layer(index)}
                {mood !== "spread" && <span className="text-ink-soft"> · {words[mood]}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
