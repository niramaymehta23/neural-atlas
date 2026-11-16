"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { classTone } from "@/design/encodings";
import type { Point } from "./datasets";

type PaintCanvasProps = {
  points: readonly Point[];
  /** Called with each new point of the chosen group. */
  onAdd: (point: Point) => void;
  /** The group new points join. */
  group: number;
  /** Plain description, such as "Garden: tap to plant apples or pears". */
  label: string;
  /** Drawn underneath the points (a DecisionField). */
  children?: ReactNode;
  className?: string;
};

const VIEW = 200;
/** Dragging leaves a trail of points at least this far apart (in −1…1 units). */
const TRAIL_GAP = 0.06;
const CURSOR_STEP = 0.05;

/**
 * Position in the SVG box, rounded: the server and the browser can disagree in the last digit of
 * Math.sin, which would break hydration of seeded datasets.
 */
const toView = (value: number) => Math.round(((value + 1) / 2) * VIEW * 100) / 100;

/**
 * Click or drag to add points of the chosen group. From the keyboard: arrows move a ring,
 * Enter or Space plants a point there.
 */
export function PaintCanvas({
  points,
  onAdd,
  group,
  label,
  children,
  className = "",
}: PaintCanvasProps) {
  const surface = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const plant = (x: number, y: number) => {
    last.current = { x, y };
    onAdd({ x, y, label: group });
  };

  const fromPointer = (event: PointerEvent) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box || box.width === 0) return null;
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = 1 - ((event.clientY - box.top) / box.height) * 2;
    return { x: Math.min(1, Math.max(-1, x)), y: Math.min(1, Math.max(-1, y)) };
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const at = cursor ?? { x: 0, y: 0 };
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-CURSOR_STEP, 0],
      ArrowRight: [CURSOR_STEP, 0],
      ArrowUp: [0, CURSOR_STEP],
      ArrowDown: [0, -CURSOR_STEP],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      const clamp = (value: number) => Math.min(1, Math.max(-1, Number(value.toFixed(4))));
      setCursor({ x: clamp(at.x + move[0]), y: clamp(at.y + move[1]) });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setCursor(at);
      plant(at.x, at.y);
    }
  };

  return (
    <div
      ref={surface}
      role="application"
      aria-label={label}
      aria-roledescription="drawing board"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => setCursor(null)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const at = fromPointer(event);
        if (at) plant(at.x, at.y);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const at = fromPointer(event);
        const previous = last.current;
        if (at && (!previous || Math.hypot(at.x - previous.x, at.y - previous.y) >= TRAIL_GAP))
          plant(at.x, at.y);
      }}
      className={`relative aspect-square cursor-crosshair touch-none overflow-hidden rounded-card border border-hairline bg-paper ${className}`}
    >
      <div className="absolute inset-0">{children}</div>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full" aria-hidden>
        {points.map(({ x, y, label: pointGroup }, index) => (
          <circle
            key={index}
            data-group={pointGroup}
            cx={toView(x)}
            cy={toView(-y)}
            r={3.2}
            fill={classTone(pointGroup)}
            stroke="var(--color-paper)"
            strokeWidth={1}
          />
        ))}
        {cursor && (
          <circle
            data-cursor
            cx={toView(cursor.x)}
            cy={toView(-cursor.y)}
            r={6}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
        )}
      </svg>
    </div>
  );
}
