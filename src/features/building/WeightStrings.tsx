"use client";

import { useId, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { fullness, thickness, weightDash, weightTone } from "@/design/encodings";
import { useSpring } from "@/design/motion";
import { snapToStep, valueForKey } from "@/ui/keyboard-step";
import { useHoldDrag } from "./use-hold-drag";

/** The words the strings speak; each lesson passes them from its captions. */
export type StringWords = {
  /** What the whole picture is, for screen readers. */
  label: string;
  /** How to pull a string from the keyboard or by touch. */
  instructions: string;
  /** A string's name: "How much it trusts the sun". */
  string: (voice: string) => string;
  /** A string's pull in words: "trusts it a lot", "pushes against it a little". */
  pull: (weight: number) => string;
  /** The voice button's name when it can be switched: "The sun says yes". */
  voice?: (voice: string, on: boolean) => string;
  /** The cell at the end of the strings: "The cell: says yes, quite sure". */
  cell: string;
};

export type Voice = { name: string; on?: boolean };

type WeightStringsProps = {
  voices: readonly Voice[];
  weights: readonly number[];
  /** Strings run from −max (pushes against) to max (trusts). */
  max: number;
  step?: number;
  onWeight?: (index: number, weight: number) => void;
  /** Present to let each voice be switched between saying yes and staying quiet. */
  onVoice?: (index: number) => void;
  /** How sure the cell is of "yes", 0–1. */
  output: number;
  words: StringWords;
};

const WIDTH = 420;
const ROW = 76;
const VOICE_X = 92;
const CELL_X = 360;
/** How far a string's middle bends at full pull (px). */
const BEND = 30;

/**
 * Weights on strings: each voice is tied to the cell by a string. Thicker means it counts for
 * more; a dashed rose string pushes against "yes". Pull a string's knob up to trust that voice
 * more, down to push against it (drag it; on a phone hold it a moment first, so a swipe still
 * scrolls; or use the arrow keys). Each string wobbles when plucked, unless motion is reduced.
 */
export function WeightStrings({
  voices,
  weights,
  max,
  step = 0.1,
  onWeight,
  onVoice,
  output,
  words,
}: WeightStringsProps) {
  const height = Math.max(ROW * voices.length, ROW * 2);
  const cellY = height / 2;
  const instructionsId = useId();
  return (
    <div className="flex flex-col gap-2" data-weight-strings>
      <p id={instructionsId} className="sr-only">
        {words.instructions}
      </p>
      <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${height}` }}>
        <svg
          role="img"
          aria-label={words.label}
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="absolute inset-0 size-full"
        >
          {voices.map((voice, index) => (
            <StringPath
              key={voice.name}
              y={ROW * index + ROW / 2}
              cellY={cellY}
              weight={weights[index] ?? 0}
              max={max}
              quiet={voice.on === false}
            />
          ))}
          <circle cx={CELL_X} cy={cellY} r={26} fill="var(--color-paper)" />
          <circle
            cx={CELL_X}
            cy={cellY}
            r={26}
            fill="var(--color-flow)"
            fillOpacity={fullness(output)}
            stroke="var(--color-ink)"
            strokeWidth={1.5}
            data-cell-output={output.toFixed(2)}
          />
        </svg>
        {voices.map((voice, index) => {
          const y = ROW * index + ROW / 2;
          const weight = weights[index] ?? 0;
          return (
            <div key={voice.name}>
              {onVoice ? (
                <button
                  type="button"
                  aria-pressed={voice.on !== false}
                  aria-label={words.voice?.(voice.name, voice.on !== false)}
                  onClick={() => onVoice(index)}
                  className="absolute flex min-h-11 -translate-y-1/2 items-center gap-1 rounded-pill border border-hairline bg-paper px-2 text-xs aria-pressed:border-2 aria-pressed:border-ink md:min-h-8"
                  style={{
                    left: 0,
                    top: `${(y / height) * 100}%`,
                    maxWidth: `${(VOICE_X / WIDTH) * 100 + 8}%`,
                  }}
                  data-voice={index}
                >
                  <VoiceMark on={voice.on !== false} />
                  <span className="truncate">{voice.name}</span>
                </button>
              ) : (
                <span
                  className="absolute -translate-y-1/2 text-xs"
                  style={{
                    left: 0,
                    top: `${(y / height) * 100}%`,
                    maxWidth: `${(VOICE_X / WIDTH) * 100}%`,
                  }}
                >
                  {voice.name}
                </span>
              )}
              {onWeight && (
                <Knob
                  name={words.string(voice.name)}
                  valueText={words.pull(weight)}
                  describedBy={instructionsId}
                  weight={weight}
                  max={max}
                  step={step}
                  left={((VOICE_X + 2 * ((VOICE_X + CELL_X) / 2) + CELL_X - 26) / 4 / WIDTH) * 100}
                  top={((y + cellY) / 2 / height) * 100}
                  bend={BEND / height}
                  onChange={(next) => onWeight(index, next)}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-ink-soft" data-cell-says>
        {words.cell}
      </p>
    </div>
  );
}

/** A yes mark (filled with a tick) or a quiet mark (an empty ring), so on and off read without colour. */
function VoiceMark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
      <circle
        cx={6}
        cy={6}
        r={5}
        fill={on ? "var(--color-ink)" : "none"}
        stroke="var(--color-ink)"
      />
      {on && (
        <path
          d="M3.5 6.2 L5.3 8 L8.6 4.3"
          stroke="var(--color-paper)"
          strokeWidth={1.4}
          fill="none"
        />
      )}
    </svg>
  );
}

function StringPath({
  y,
  cellY,
  weight,
  max,
  quiet,
}: {
  y: number;
  cellY: number;
  weight: number;
  max: number;
  quiet: boolean;
}) {
  const transition = useSpring("settle");
  const share = Math.max(-1, Math.min(1, weight / max));
  const width = thickness(Math.abs(share));
  const midX = (VOICE_X + CELL_X) / 2;
  const midY = (y + cellY) / 2 - share * BEND * 2;
  const d = `M${VOICE_X} ${y} Q${midX} ${midY.toFixed(2)} ${CELL_X - 26} ${cellY}`;
  return (
    <motion.path
      initial={false}
      animate={{ d }}
      transition={transition}
      fill="none"
      stroke={weightTone(weight)}
      strokeOpacity={quiet ? 0.35 : 1}
      strokeWidth={width}
      strokeDasharray={weightDash(weight, width)}
      strokeLinecap="round"
      data-string-weight={weight.toFixed(2)}
    />
  );
}

function Knob({
  name,
  valueText,
  describedBy,
  weight,
  max,
  step,
  left,
  top,
  bend,
  onChange,
}: {
  name: string;
  valueText: string;
  describedBy: string;
  weight: number;
  max: number;
  step: number;
  left: number;
  top: number;
  bend: number;
  onChange: (weight: number) => void;
}) {
  const least = -max;
  const range = { min: least, max, step };
  const { ref, handlers } = useHoldDrag<HTMLDivElement>({
    onDrag: ({ clientY }) => {
      const box = ref.current?.parentElement?.getBoundingClientRect();
      if (!box || box.height === 0) return;
      // The knob's resting height is the string's middle; up is trust, down pushes against.
      const rest = box.top + (top / 100) * box.height;
      const pulled = (rest - clientY) / (box.height * bend);
      onChange(snapToStep(pulled * max, range));
    },
  });
  const onKeyDown = (event: KeyboardEvent) => {
    const next = valueForKey(event.key, weight, range);
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };
  const share = Math.max(-1, Math.min(1, weight / max));
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={name}
      aria-valuemin={least}
      aria-valuemax={max}
      aria-valuenow={weight}
      aria-valuetext={valueText}
      aria-describedby={describedBy}
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      {...handlers}
      className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-manipulation items-center justify-center rounded-full"
      // A curve's middle sits half as far out as its bend handle.
      style={{ left: `${left}%`, top: `calc(${top}% - ${share * bend * 100}%)` }}
      data-knob
    >
      <span className="block size-4 rounded-full border-2 border-ink bg-paper" />
    </div>
  );
}
