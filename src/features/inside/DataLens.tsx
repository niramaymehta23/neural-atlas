"use client";

import { useId, type KeyboardEvent } from "react";
import { useHoldDrag } from "@/features/building/use-hold-drag";

/** The words the lens speaks; each lesson passes them from its captions. */
export type LensWords = {
  /** The lens's name: "Magnifying glass". */
  label: string;
  /** How to move it from the keyboard or by touch. */
  instructions: string;
};

export type LensSpot = { x: number; y: number };

type DataLensProps = {
  /** The dots, in −1…1 with y pointing up (as the garden draws them). */
  points: readonly LensSpot[];
  /** Per dot, the chance it belongs to the second group (0–1); null while there is no guess. */
  chances: ArrayLike<number> | null;
  lens: LensSpot;
  onMove: (lens: LensSpot) => void;
  words: LensWords;
  /** The lens's reach, in −1…1 units. */
  radius?: number;
};

const VIEW = 200;
const KEY_STEP = 0.05;
/** A guess this far from fifty-fifty counts as sure (it says 80 out of 100 or more). */
export const SURE = 0.6;

const toView = (value: number) => ((value + 1) / 2) * VIEW;
const clampSpot = (value: number) => Math.max(-1, Math.min(1, Math.round(value * 1000) / 1000));

/** How sure a chance is, from 0 (fifty-fifty) to 1 (certain either way). */
export const sureness = (chance: number) => Math.min(1, Math.abs(2 * chance - 1));

/** The dots inside the lens, and how many of them it is sure about. */
export function lensCount(
  points: readonly LensSpot[],
  chances: ArrayLike<number> | null,
  lens: LensSpot,
  radius: number,
) {
  let inside = 0;
  let sure = 0;
  points.forEach((point, index) => {
    if (Math.hypot(point.x - lens.x, point.y - lens.y) > radius) return;
    inside += 1;
    if (chances && sureness(chances[index] ?? 0.5) >= SURE) sure += 1;
  });
  return { inside, sure };
}

/**
 * The data lens: a magnifying glass dragged over the dots. Inside it every dot wears a halo as
 * wide as the model is sure about it; unsure dots get a dashed halo, so sureness reads from
 * size and dash, not colour. Drag it (on a phone, hold it a moment first), or focus it and use
 * the arrow keys. Lay it over the picture of the dots; only the glass itself takes the pointer.
 * The lesson says what the lens shows (`lensCount`) in its own words and its `describe`.
 */
export function DataLens({ points, chances, lens, onMove, words, radius = 0.3 }: DataLensProps) {
  const instructionsId = useId();
  const { ref, handlers } = useHoldDrag<SVGGElement>({
    onDrag: ({ clientX, clientY }) => {
      const box = ref.current?.ownerSVGElement?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      onMove({
        x: clampSpot(((clientX - box.left) / box.width) * 2 - 1),
        y: clampSpot(1 - ((clientY - box.top) / box.height) * 2),
      });
    },
  });
  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    onMove({ x: clampSpot(lens.x + move[0]), y: clampSpot(lens.y + move[1]) });
  };
  const r = (radius / 2) * VIEW;
  return (
    <>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden
      >
        {points.map((point, index) => {
          if (Math.hypot(point.x - lens.x, point.y - lens.y) > radius || !chances) return null;
          const how = sureness(chances[index] ?? 0.5);
          return (
            <circle
              key={index}
              cx={toView(point.x)}
              cy={toView(-point.y)}
              r={4 + how * 9}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={1}
              strokeDasharray={how < SURE ? "2 2" : undefined}
              data-halo={how.toFixed(2)}
            />
          );
        })}
      </svg>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="pointer-events-none absolute inset-0 size-full"
      >
        <g
          ref={ref}
          role="application"
          tabIndex={0}
          aria-label={words.label}
          aria-describedby={instructionsId}
          onKeyDown={onKeyDown}
          {...handlers}
          className="pointer-events-auto cursor-grab touch-manipulation focus-visible:outline-none"
          data-lens={`${lens.x},${lens.y}`}
        >
          <circle
            cx={toView(lens.x)}
            cy={toView(-lens.y)}
            r={r}
            fill="var(--color-paper)"
            fillOpacity={0.15}
            stroke="var(--color-ink)"
            strokeWidth={2.5}
          />
          <circle
            cx={toView(lens.x) + r * 0.72}
            cy={toView(-lens.y) + r * 0.72}
            r={7}
            fill="var(--color-accent)"
            stroke="var(--color-ink)"
            strokeWidth={1.5}
          />
        </g>
      </svg>
      <p id={instructionsId} className="sr-only">
        {words.instructions}
      </p>
    </>
  );
}
