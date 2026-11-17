"use client";

import { motion, type PanInfo } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { thickness } from "@/design/encodings";
import { useSpring } from "@/design/motion";
import type { Threads } from "@/engine/pretrained/attention";
import { HoverNote } from "@/ui/HoverNote";
import { words as captionWords } from "./captions";

type ThreadViewProps = {
  threads: Threads;
  focus: number;
  onFocus: (word: number) => void;
  /** Moves a word to another place in the sentence. */
  onMove?: (from: number, to: number) => void;
};

const WIDTH = 1000;
const HEIGHT = 260;
const BASELINE = 230;
/** Threads lighter than this are left out, so the picture stays readable. */
const FAINT = 0.04;
const SLOT_MIN_PX = 56;

const slotX = (index: number, count: number) => ((index + 0.5) / count) * WIDTH;

/** A soft arc from one word up and over to another; longer jumps arc higher. */
export function arc(from: number, to: number, count: number): string {
  const x1 = slotX(from, count);
  const x2 = slotX(to, count);
  const lift = 40 + Math.abs(x2 - x1) * 0.4;
  const round = (value: number) => Math.round(value * 10) / 10;
  return `M ${round(x1)} ${BASELINE} Q ${round((x1 + x2) / 2)} ${round(BASELINE - lift)} ${round(x2)} ${BASELINE}`;
}

/** Identity for a word that survives reordering: the word and which copy of it this is. */
const keysOf = (words: readonly string[]) =>
  words.map((word, index) => `${word}-${words.slice(0, index).filter((w) => w === word).length}`);

/** Word chips in a row with soft curved threads to the words each one looks at. */
export function ThreadView({ threads, focus, onFocus, onMove }: ThreadViewProps) {
  const { words, looks } = threads;
  const row = useRef<HTMLDivElement>(null);
  const settle = useSpring("settle");
  const keys = keysOf(words);
  const count = words.length;

  const moveBy = (from: number, by: number) => {
    const to = Math.min(count - 1, Math.max(0, from + by));
    if (to !== from) onMove?.(from, to);
  };
  const onDragEnd =
    (from: number) =>
    (_event: unknown, { offset }: PanInfo) => {
      const slot = (row.current?.getBoundingClientRect().width ?? 0) / count;
      if (slot > 0) moveBy(from, Math.round(offset.x / slot));
    };
  const onKeyDown = (from: number) => (event: KeyboardEvent) => {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    moveBy(from, event.key === "ArrowLeft" ? -1 : 1);
  };

  // Thickness is relative to each word's strongest look, so its favourite always reads clearly.
  const shown = looks.flatMap((targets, from) => {
    if (focus >= 0 && from !== focus) return [];
    const strongest = Math.max(...targets) || 1;
    return targets.flatMap((look, to) =>
      look < FAINT ? [] : [{ from, to, strength: look / strongest }],
    );
  });

  return (
    <div className="overflow-x-auto">
      <div
        ref={row}
        className="relative w-full"
        style={{ minWidth: count * SLOT_MIN_PX, aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={captionWords.scene}
        >
          {shown.map(({ from, to, strength }) => (
            <motion.path
              key={`${keys[from]}>${keys[to]}`}
              data-thread={`${words[from]}>${words[to]}`}
              initial={false}
              animate={{ d: arc(from, to, count), strokeWidth: thickness(strength) }}
              transition={settle}
              fill="none"
              stroke={focus >= 0 ? "var(--color-accent)" : "var(--color-ink-soft)"}
              strokeOpacity={0.2 + 0.6 * strength}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {words.map((word, index) => (
          <motion.div
            key={keys[index]}
            className="absolute -translate-x-1/2"
            style={{ top: `${(BASELINE / HEIGHT) * 100}%` }}
            initial={false}
            animate={{ left: `${(slotX(index, count) / WIDTH) * 100}%` }}
            transition={settle}
            drag={onMove ? "x" : false}
            dragSnapToOrigin
            dragMomentum={false}
            onDragEnd={onDragEnd(index)}
          >
            <HoverNote note={captionWords.wordNote(word)}>
              <button
                type="button"
                data-word={word}
                aria-pressed={focus === index}
                onClick={() => onFocus(focus === index ? -1 : index)}
                onKeyDown={onKeyDown(index)}
                className="cursor-grab touch-none rounded-pill border border-hairline bg-card px-2.5 py-1 text-sm whitespace-nowrap active:cursor-grabbing aria-pressed:border-accent aria-pressed:text-accent-ink"
              >
                {word}
              </button>
            </HoverNote>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
