"use client";

import { Slider as RadixSlider } from "radix-ui";
import { count } from "@/design/copy";
import { extent, linePath } from "@/design/encodings";

type TimelineScrubberProps = {
  /** Recorded moments so far. */
  length: number;
  /** The moment shown (0-based). */
  position: number;
  playing: boolean;
  onPlayToggle: () => void;
  onSeek: (position: number) => void;
  /** Mistake size per recorded moment, painted along the track. */
  losses: readonly number[];
  /** The previous run's mistakes, painted faint beside the current ones. */
  ghostLosses?: readonly number[];
  /** Words for a moment, read aloud. Defaults to "Moment five of twenty". */
  describe?: (position: number, length: number) => string;
  className?: string;
};

const SPARK = { width: 400, height: 36 };

const momentWords = (position: number, length: number) =>
  `Moment ${count(position + 1)} of ${count(length)}`;

const BUTTON =
  "grid size-9 shrink-0 place-items-center rounded-pill border border-hairline bg-paper text-ink transition-colors duration-200 ease-settle hover:bg-card disabled:opacity-40";

/** Video-editor-style bar for recorded training: play, step and scrub, over the mistake curve. */
export function TimelineScrubber({
  length,
  position,
  playing,
  onPlayToggle,
  onSeek,
  losses,
  ghostLosses = [],
  describe = momentWords,
  className = "",
}: TimelineScrubberProps) {
  const last = Math.max(0, length - 1);
  const empty = length === 0;
  const range = extent([...losses, ...ghostLosses]);
  const span = Math.max(losses.length, ghostLosses.length, 2) - 1;
  const lineFor = (values: readonly number[]) =>
    linePath(values, (SPARK.width * Math.max(0, values.length - 1)) / span, SPARK.height, range);
  const seek = (next: number) => onSeek(Math.min(last, Math.max(0, next)));

  return (
    <div
      className={`flex items-center gap-2 rounded-card border border-hairline bg-card px-3 py-2 ${className}`}
    >
      <button
        type="button"
        className={BUTTON}
        aria-label="Back one moment"
        disabled={empty || position <= 0}
        onClick={() => seek(position - 1)}
      >
        <StepIcon flip />
      </button>
      <button
        type="button"
        className={BUTTON}
        aria-label={playing ? "Pause" : "Play"}
        disabled={empty}
        onClick={onPlayToggle}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className={BUTTON}
        aria-label="Forward one moment"
        disabled={empty || position >= last}
        onClick={() => seek(position + 1)}
      >
        <StepIcon />
      </button>

      <RadixSlider.Root
        className="relative mx-2 flex h-10 grow touch-none items-center select-none"
        value={[Math.min(position, last)]}
        min={0}
        max={Math.max(1, last)}
        step={1}
        disabled={empty}
        onValueChange={([next]) => next !== undefined && seek(next)}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-full w-full overflow-visible"
        >
          <path
            data-line="ghost"
            d={lineFor(ghostLosses)}
            fill="none"
            stroke="var(--color-ink-soft)"
            strokeOpacity={0.5}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            data-line="current"
            d={lineFor(losses)}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <RadixSlider.Track className="relative h-1 grow self-end rounded-pill bg-inset">
          <RadixSlider.Range className="absolute h-full rounded-pill bg-ink-soft" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-label="Moment"
          aria-valuetext={empty ? "Nothing recorded yet" : describe(position, length)}
          className="block h-10 w-1.5 cursor-grab rounded-pill bg-accent active:cursor-grabbing"
        />
      </RadixSlider.Root>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path d="M4.5 2.8 L13 8 L4.5 13.2 Z" fill="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <rect x="3.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="9.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

function StepIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-3.5 ${flip ? "-scale-x-100" : ""}`} aria-hidden>
      <path d="M3.5 3.5 L10 8 L3.5 12.5 Z" fill="currentColor" />
      <rect x="11" y="3.5" width="2" height="9" rx="1" fill="currentColor" />
    </svg>
  );
}
