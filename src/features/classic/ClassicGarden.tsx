"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DecisionField } from "@/data/DecisionField";
import type { Point } from "@/data/datasets";
import { PaintCanvas, type PaintWords } from "@/data/PaintCanvas";
import { plantInto } from "./garden";

/** The brush that pulls dots up instead of planting. */
export const PULL = 2;

export type GardenWords = {
  /** What the garden is and how to use it, read when it is focused. */
  label: string;
  paint: PaintWords;
  /** Said when the garden is full. */
  full: string;
};

type ClassicGardenProps = {
  dots: readonly Point[];
  /** Applies a change to the newest dots (planting is batched once per animation frame). */
  onChange: (change: (dots: readonly Point[]) => Point[]) => void;
  /** The group a tap plants, or PULL. */
  brush: number;
  /** The model's opinion of every spot, drawn under the dots; null clears it. */
  field: Float32Array | null;
  groups?: number;
  resolution?: number;
  words: GardenWords;
  /** Drawn over the field and under the dots, in −1…1 units (a `GardenOverlay`). */
  overlay?: ReactNode;
  /** Drawn over the dots (markers the learner must see), in −1…1 units; never catches taps. */
  above?: ReactNode;
  /** Shown under the garden (a status line); it keeps its space so nothing jumps. */
  footer?: ReactNode;
  /** False to look but not touch (the compare split's right half). */
  editable?: boolean;
  /** Called instead of planting: the spot tapped (for lessons where a tap asks a question). */
  onPick?: (spot: Point) => void;
};

/**
 * A square garden of two kinds of dots over a decision field. Tap or drag to plant (a held
 * finger on a touch screen; a swipe scrolls), or pull dots up; arrows and Enter from the keyboard.
 * Each group has its own shape. Stops at the cap with a note.
 */
export function ClassicGarden({
  dots,
  onChange,
  brush,
  field,
  groups = 2,
  resolution = 48,
  words,
  overlay,
  above,
  footer,
  editable = true,
  onPick,
}: ClassicGardenProps) {
  const [full, setFull] = useState(false);
  const planting = useRef<Point[]>([]);
  const flush = useRef(0);
  useEffect(() => () => cancelAnimationFrame(flush.current), []);

  const onAdd = (point: Point) => {
    if (!editable) return;
    if (onPick) return onPick(point);
    planting.current.push(point);
    if (flush.current) return;
    flush.current = requestAnimationFrame(() => {
      flush.current = 0;
      const batch = planting.current;
      planting.current = [];
      onChange((now) => {
        const planted = plantInto(now, batch);
        setFull(planted.full);
        return planted.dots;
      });
    });
  };
  const onRemove = (indices: number[]) => {
    if (!editable) return;
    const gone = new Set(indices);
    setFull(false);
    onChange((now) => now.filter((_, index) => !gone.has(index)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <PaintCanvas
          label={words.label}
          words={words.paint}
          points={dots}
          group={brush === PULL ? 0 : brush}
          erasing={brush === PULL && !onPick}
          onAdd={onAdd}
          onRemove={onRemove}
        >
          <DecisionField outputs={field} groups={groups} resolution={resolution} />
          {overlay}
        </PaintCanvas>
        {above && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-card">
            {above}
          </div>
        )}
      </div>
      <div className="min-h-10 text-sm text-ink-soft" data-garden-footer>
        {full ? <p data-notice="full">{words.full}</p> : footer}
      </div>
    </div>
  );
}

/** An SVG laid over the garden in −1…1 units, up being up. */
export function GardenOverlay({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="-1 -1 2 2"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
    >
      <g transform="scale(1 -1)">{children}</g>
    </svg>
  );
}
