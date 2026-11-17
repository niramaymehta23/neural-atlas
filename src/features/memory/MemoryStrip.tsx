"use client";

import { LENGTH, type StripReading } from "./run";

export type MemoryStripWords = {
  /** What the picture shows, read out instead of the drawing. */
  picture: string;
  /** The two first words: sunny, then rainy. */
  first: readonly [string, string];
  /** The filler words, in the order `STORY` numbers them. */
  fillers: readonly string[];
  /** The key to the three gate jars under each word (gated cell only). */
  gatesKey?: string;
};

type Props = {
  words: MemoryStripWords;
  /** Filler-word numbers after the first word. */
  story: readonly number[];
  rainy: boolean;
  reading: StripReading;
  /** Draws each word's three gates under it. */
  gated: boolean;
};

const PER_ROW = 5;
const ROWS = Math.ceil(LENGTH.max / PER_ROW);
const WIDTH = 320;
const COLUMN = WIDTH / PER_ROW;
const BEAD = 11;
const GATE = 9;

/**
 * A sentence read one word at a time, with a memory bead over every word: the bead's filled share
 * (its size, not only its tone) is how much the cell still remembers the first word there. The
 * gated cell also shows, under each word, how open its keep, let-in and read-out gates were, as
 * three small jars filled from the bottom, always in that order. Room is kept for the longest
 * sentence, so changing the length never moves the page.
 */
export function MemoryStrip({ words, story, rainy, reading, gated }: Props) {
  const rowHeight = gated ? 66 : 50;
  const height = ROWS * rowHeight;
  const sentence = [words.first[rainy ? 1 : 0], ...story.map((word) => words.fillers[word] ?? "")];
  return (
    <figure className="flex flex-col gap-1">
      <svg
        role="img"
        aria-label={words.picture}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full rounded-card border border-hairline bg-paper"
      >
        {sentence.map((word, index) => {
          const x = (index % PER_ROW) * COLUMN + COLUMN / 2;
          const top = Math.floor(index / PER_ROW) * rowHeight;
          const bead = reading.beads[index] ?? 0;
          const open = reading.openness[index];
          return (
            <g key={index} data-word={index} data-bead={bead.toFixed(2)}>
              <circle
                cx={x}
                cy={top + 16}
                r={BEAD}
                fill="var(--color-card)"
                stroke="var(--color-ink)"
                strokeWidth={1.5}
              />
              {bead > 0.02 && (
                <circle
                  cx={x}
                  cy={top + 16}
                  r={BEAD * Math.sqrt(bead)}
                  fill="var(--color-flow)"
                  stroke="var(--color-ink)"
                  strokeWidth={0.75}
                />
              )}
              <text
                x={x}
                y={top + 42}
                textAnchor="middle"
                fontSize={13}
                fontWeight={index === 0 ? 700 : 400}
                fill="var(--color-ink)"
              >
                {word}
              </text>
              {gated && open && (
                <g aria-hidden>
                  {[open.keep, open.letIn, open.readOut].map((level, gate) => {
                    const left = x - 1.5 * GATE - 2 + gate * (GATE + 2);
                    const bottom = top + 50 + GATE;
                    return (
                      <g key={gate}>
                        <rect
                          x={left}
                          y={top + 50}
                          width={GATE}
                          height={GATE}
                          fill="var(--color-card)"
                          stroke="var(--color-ink-soft)"
                        />
                        <rect
                          x={left}
                          y={bottom - GATE * level}
                          width={GATE}
                          height={GATE * level}
                          fill="var(--color-ink-soft)"
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {gated && (
        <figcaption className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          <svg viewBox="0 0 31 9" className="h-2.5 w-8" aria-hidden>
            {[0, 1, 2].map((gate) => (
              <rect
                key={gate}
                x={gate * 11 + 0.5}
                y={0.5}
                width={8}
                height={8}
                fill="var(--color-card)"
                stroke="var(--color-ink-soft)"
              />
            ))}
          </svg>
          {words.gatesKey}
        </figcaption>
      )}
    </figure>
  );
}
