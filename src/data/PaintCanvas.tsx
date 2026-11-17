"use client";

import {
  useEffect,
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
  /** What was just pulled up and where (needed with `onRemove`). */
  removed?: (count: number, across: number, up: number) => string;
};

type PaintCanvasProps = {
  points: readonly Point[];
  /** Called with each new point of the chosen group. */
  onAdd: (point: Point) => void;
  /** The group new points join. */
  group: number;
  /**
   * Present to pull points up instead: called with the indices (into `points`) within reach of
   * a tap, a drag or the keyboard ring.
   */
  onRemove?: (indices: number[]) => void;
  /** True while a tap pulls points up rather than planting (needs `onRemove`). */
  erasing?: boolean;
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
/** Pulling up reaches points this close (in −1…1 units). */
const REACH = 0.07;
/**
 * On a touch screen a finger that moves before this long scrolls the page; one held still this
 * long paints, and a quick tap plants one point (QL-14).
 */
export const HOLD_MS = 250;
/** How far (px) a finger may wander and still count as held still. */
const STILL_PX = 8;

/**
 * Position in the SVG box, rounded: the server and the browser can disagree in the last digit of
 * Math.sin, which would break hydration of seeded datasets.
 */
const toView = (value: number) => Math.round(((value + 1) / 2) * VIEW * 100) / 100;

const percent = (value: number) => Math.round(((value + 1) / 2) * 100);

type Spot = { x: number; y: number };

/**
 * Click or drag to add points of the chosen group (or pull them up). From the keyboard: arrows
 * move a ring, Enter or Space plants (or pulls up) there, and a polite line says where the ring
 * is and what changed. Each group has its own shape, outlined in ink, so groups never rest on
 * colour (A11Y-08). On a touch screen a swipe scrolls the page; a tap or a held finger paints.
 */
export function PaintCanvas({
  points,
  onAdd,
  group,
  onRemove,
  erasing = false,
  label,
  children,
  words,
  className = "",
}: PaintCanvasProps) {
  const surface = useRef<HTMLDivElement>(null);
  const last = useRef<Spot | null>(null);
  /** A finger on the garden: where it went down, and whether it has started painting. */
  const touch = useRef<{ id: number; x: number; y: number; painting: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPoints = useRef(points);
  const instructionsId = useId();
  const [cursor, setCursor] = useState<Spot | null>(null);
  const [spoken, setSpoken] = useState("");
  const pulling = erasing && Boolean(onRemove);
  const where = (at: Spot) => (words ? words.position(percent(at.x), percent(at.y)) : "");

  useEffect(() => {
    latestPoints.current = points;
  }, [points]);

  // Once a held finger paints, the page must not scroll under it (a passive listener can't stop it).
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const stopScroll = (event: TouchEvent) => {
      if (touch.current?.painting && event.cancelable) event.preventDefault();
    };
    element.addEventListener("touchmove", stopScroll, { passive: false });
    return () => element.removeEventListener("touchmove", stopScroll);
  }, []);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );

  const within = (at: Spot) =>
    latestPoints.current.flatMap((point, index) =>
      Math.hypot(point.x - at.x, point.y - at.y) <= REACH ? [index] : [],
    );

  /** Plants at `at`, or pulls up what is within reach; returns how many were pulled up. */
  const paintAt = (at: Spot) => {
    last.current = at;
    if (!pulling) {
      onAdd({ x: at.x, y: at.y, label: group });
      return 0;
    }
    const reached = within(at);
    if (reached.length > 0) onRemove?.(reached);
    return reached.length;
  };

  const fromPointer = (event: { clientX: number; clientY: number }) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box || box.width === 0) return null;
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = 1 - ((event.clientY - box.top) / box.height) * 2;
    return { x: Math.min(1, Math.max(-1, x)), y: Math.min(1, Math.max(-1, y)) };
  };

  /** Paints along a drag, a trail of points at least TRAIL_GAP apart (every move when pulling up). */
  const dragTo = (event: PointerEvent) => {
    const at = fromPointer(event);
    const previous = last.current;
    if (
      at &&
      (pulling || !previous || Math.hypot(at.x - previous.x, at.y - previous.y) >= TRAIL_GAP)
    )
      paintAt(at);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
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
      const pulled = paintAt(at);
      if (!words) return;
      if (!pulling) setSpoken(words.planted(group, percent(at.x), percent(at.y)));
      else setSpoken(words.removed?.(pulled, percent(at.x), percent(at.y)) ?? "");
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
      data-erasing={pulling || undefined}
      onKeyDown={onKeyDown}
      onFocus={() => {
        const start = cursor ?? { x: 0, y: 0 };
        setCursor(start);
        setSpoken(where(start));
      }}
      onBlur={() => setCursor(null)}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") {
          // Wait: a finger that moves at once is scrolling the page, not painting.
          const { pointerId, clientX, clientY } = event;
          touch.current = { id: pointerId, x: clientX, y: clientY, painting: false };
          cancelHold();
          holdTimer.current = setTimeout(() => {
            const held = touch.current;
            if (!held || held.id !== pointerId) return;
            held.painting = true;
            surface.current?.setPointerCapture?.(pointerId);
            const at = fromPointer({ clientX: held.x, clientY: held.y });
            if (at) paintAt(at);
          }, HOLD_MS);
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        const at = fromPointer(event);
        if (at) paintAt(at);
      }}
      onPointerMove={(event) => {
        const held = touch.current;
        if (event.pointerType === "touch") {
          if (!held || held.id !== event.pointerId) return;
          if (held.painting) return dragTo(event);
          if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > STILL_PX) {
            // Moved before the hold: a scroll. Let the page have it.
            cancelHold();
            touch.current = null;
          }
          return;
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) dragTo(event);
      }}
      onPointerUp={(event) => {
        const held = touch.current;
        if (event.pointerType !== "touch" || !held || held.id !== event.pointerId) return;
        cancelHold();
        touch.current = null;
        // A quick tap that never moved plants (or pulls up) once.
        if (!held.painting) {
          const at = fromPointer(event);
          if (at) paintAt(at);
        }
      }}
      onPointerCancel={() => {
        cancelHold();
        touch.current = null;
      }}
      className={`relative aspect-square touch-pan-y overflow-hidden rounded-card border border-hairline bg-paper focus-visible:outline-offset-0 ${pulling ? "cursor-cell" : "cursor-crosshair"} ${className}`}
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
              r={pulling ? (REACH / 2) * VIEW : 7}
              stroke="var(--color-ink)"
              strokeWidth={3}
            />
            <circle
              cx={toView(cursor.x)}
              cy={toView(-cursor.y)}
              r={pulling ? (REACH / 2) * VIEW : 7}
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
