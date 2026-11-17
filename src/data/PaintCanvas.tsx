"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { classMark, classTone, markPath } from "@/design/encodings";
import type { Point } from "./datasets";

/** The words a garden speaks; the lesson passes them from its captions. */
export type PaintWords = {
  /** How to plant from the keyboard, read when the garden is focused. */
  instructions: string;
  /** Where the ring is, as whole percents from the left and from the bottom. */
  position: (across: number, up: number) => string;
  /** What was just planted and where, such as "Planted a daisy at 50% across, 50% up". */
  planted: (group: number, across: number, up: number) => string;
};

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
  /** Instructions and spoken positions for keyboard and screen reader users. */
  words?: PaintWords;
  className?: string;
};

const VIEW = 200;
/** Dragging leaves a trail of points at least this far apart (in −1…1 units). */
const TRAIL_GAP = 0.06;
const CURSOR_STEP = 0.05;
const POINT_RADIUS = 3.4;

/**
 * Position in the SVG box, rounded: the server and the browser can disagree in the last digit of
 * Math.sin, which would break hydration of seeded datasets.
 */
const toView = (value: number) => Math.round(((value + 1) / 2) * VIEW * 100) / 100;

const percent = (value: number) => Math.round(((value + 1) / 2) * 100);

/**
 * Click or drag to add points of the chosen group. From the keyboard: arrows move a ring,
 * Enter or Space plants a point there, and a polite line says where the ring is and what grew.
 * Each group has its own shape, outlined in ink, so groups never rest on colour (A11Y-08).
 */
export function PaintCanvas({
  points,
  onAdd,
  group,
  label,
  children,
  words,
  className = "",
}: PaintCanvasProps) {
  const surface = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const instructionsId = useId();
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [spoken, setSpoken] = useState("");
  const where = (at: { x: number; y: number }) =>
    words ? words.position(percent(at.x), percent(at.y)) : "";

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
      const next = { x: clamp(at.x + move[0]), y: clamp(at.y + move[1]) };
      setCursor(next);
      setSpoken(where(next));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setCursor(at);
      plant(at.x, at.y);
      if (words) setSpoken(words.planted(group, percent(at.x), percent(at.y)));
    }
  };

  return (
    <div
      ref={surface}
      role="application"
      aria-label={label}
      aria-roledescription="drawing board"
      aria-describedby={words ? instructionsId : undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => {
        const start = cursor ?? { x: 0, y: 0 };
        setCursor(start);
        setSpoken(where(start));
      }}
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
      className={`relative aspect-square cursor-crosshair touch-none overflow-hidden rounded-card border border-hairline bg-paper focus-visible:outline-offset-0 ${className}`}
    >
      <div className="absolute inset-0">{children}</div>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full" aria-hidden>
        {points.map(({ x, y, label: pointGroup }, index) => (
          <path
            key={index}
            data-group={pointGroup}
            data-shape={classMark(pointGroup)}
            d={markPath(classMark(pointGroup), toView(x), toView(-y), POINT_RADIUS)}
            fill={classTone(pointGroup)}
            stroke="var(--color-ink)"
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        ))}
        {cursor && (
          <g data-cursor fill="none">
            <circle
              cx={toView(cursor.x)}
              cy={toView(-cursor.y)}
              r={7}
              stroke="var(--color-ink)"
              strokeWidth={3}
            />
            <circle
              cx={toView(cursor.x)}
              cy={toView(-cursor.y)}
              r={7}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>
      {words && (
        <>
          <p id={instructionsId} hidden>
            {words.instructions}
          </p>
          <p aria-live="polite" className="sr-only">
            {spoken}
          </p>
        </>
      )}
    </div>
  );
}
