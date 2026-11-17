"use client";

import { motion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { tileMark, tileTone, valueMark, type TileKind } from "@/design/encodings";
import { useSpring } from "@/design/motion";

/** Where a square sits in the board's own coordinates, for drawing on top of it. */
export type Square = { index: number; x: number; y: number; size: number };

/** The words a paintable board speaks; the lesson passes them from its captions. */
export type BoardWords = {
  /** How to paint from the keyboard, read when the board is focused. */
  instructions: string;
  /** The square under the cursor, such as "Row 2, square 3: lava" (1-based). */
  square: (row: number, column: number, kind: TileKind) => string;
};

type BoardProps = {
  columns: number;
  /** Row by row, `columns` per row. */
  tiles: readonly TileKind[];
  /** Where the learner (a puppy) stands. */
  piece?: { row: number; column: number };
  /** The learner just slid sideways: it skids for a moment. */
  skid?: boolean;
  /** Plain description, such as "A small garden with a bone in the far corner". */
  label: string;
  /** Colours for floor squares (a value tint), by square; others keep their kind's tone. */
  floorTones?: readonly string[];
  /** How good each floor square is (−1…1), marked + or − so the tint is not the only cue. */
  floorValues?: readonly number[];
  /** Drawn over each square, under the learner (score arrows). */
  overlay?: (square: Square) => ReactNode;
  /** Makes the board paintable: tap or drag across squares, or arrows then Enter. */
  onPaint?: (index: number) => void;
  /** Needed with `onPaint`, so keyboard and screen reader users know where they are. */
  words?: BoardWords;
  className?: string;
};

export const CELL = 48;
const GAP = 4;
const TILE = CELL - GAP;
/** On a touch screen painting starts after a short hold, so a swipe scrolls the page instead. */
export const PAINT_HOLD_MS = 300;
/** A finger that moves this far before the hold is scrolling. */
const SCROLL_SLOP = 8;

type Stroke = {
  pointer: number;
  clientX: number;
  clientY: number;
  /** Painting: at once for a mouse, after the hold for a finger. */
  armed: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

/** A cosy board-game grid (RL worlds stay 2D). The learner hops between squares with a spring. */
export function Board({
  columns,
  tiles,
  piece,
  skid = false,
  label,
  floorTones,
  floorValues,
  overlay,
  onPaint,
  words,
  className = "",
}: BoardProps) {
  const transition = useSpring("settle");
  const instructionsId = useId();
  const [cursor, setCursor] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const stroke = useRef<Stroke | null>(null);
  const rows = Math.ceil(tiles.length / columns);
  const centre = (index: number) => index * CELL + CELL / 2;
  const width = columns * CELL + GAP;
  const height = rows * CELL + GAP;
  const home = piece ? piece.row * columns + piece.column : 0;
  const x = (index: number) => (index % columns) * CELL;
  const y = (index: number) => Math.floor(index / columns) * CELL;

  const squareAt = (event: { clientX: number; clientY: number }) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || box.width === 0) return null;
    const column = Math.floor((((event.clientX - box.left) / box.width) * width - GAP) / CELL);
    const row = Math.floor((((event.clientY - box.top) / box.height) * height - GAP) / CELL);
    return column < 0 || column >= columns || row < 0 || row >= rows
      ? null
      : row * columns + column;
  };
  const paint = (event: { clientX: number; clientY: number }) => {
    const index = squareAt(event);
    if (index !== null) onPaint?.(index);
  };
  const endStroke = () => {
    if (stroke.current?.timer) clearTimeout(stroke.current.timer);
    stroke.current = null;
  };

  // Once a finger has held long enough to paint, moving it paints instead of scrolling.
  useEffect(() => {
    const element = svg.current;
    if (!element || !onPaint) return;
    const hold = (event: TouchEvent) => {
      if (stroke.current?.armed) event.preventDefault();
    };
    element.addEventListener("touchmove", hold, { passive: false });
    return () => element.removeEventListener("touchmove", hold);
  }, [onPaint]);
  const onKeyDown = (event: KeyboardEvent) => {
    const at = cursor ?? home;
    const moves: Record<string, number> = {
      ArrowLeft: at % columns > 0 ? -1 : 0,
      ArrowRight: at % columns < columns - 1 ? 1 : 0,
      ArrowUp: at >= columns ? -columns : 0,
      ArrowDown: at + columns < tiles.length ? columns : 0,
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      setCursor(at + move);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setCursor(at);
      onPaint?.(at);
    }
  };

  const painting = onPaint && {
    role: "application",
    tabIndex: 0,
    "aria-describedby": words ? instructionsId : undefined,
    onKeyDown,
    onFocus: () => setCursor((at) => at ?? home),
    onBlur: () => setCursor(null),
    onPointerDown: (event: PointerEvent<SVGSVGElement>) => {
      endStroke();
      const target = event.currentTarget;
      const pointer = event.pointerId;
      const started: Stroke = {
        pointer,
        clientX: event.clientX,
        clientY: event.clientY,
        armed: event.pointerType === "mouse",
        timer: null,
      };
      stroke.current = started;
      if (started.armed) {
        target.setPointerCapture?.(pointer);
        paint(event);
        return;
      }
      started.timer = setTimeout(() => {
        started.armed = true;
        started.timer = null;
        if (target.isConnected) target.setPointerCapture?.(pointer);
        paint(started);
      }, PAINT_HOLD_MS);
    },
    onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
      const now = stroke.current;
      if (!now || now.pointer !== event.pointerId) return;
      if (now.armed) paint(event);
      else if (Math.hypot(event.clientX - now.clientX, event.clientY - now.clientY) > SCROLL_SLOP)
        endStroke();
    },
    onPointerUp: () => {
      const now = stroke.current;
      endStroke();
      // A quick tap that never moved paints the square it touched.
      if (now && !now.armed) paint(now);
    },
    onPointerCancel: endStroke,
  };
  const cursorKind = cursor === null ? undefined : tiles[cursor];
  const spoken =
    cursor !== null && cursorKind && words
      ? words.square(Math.floor(cursor / columns) + 1, (cursor % columns) + 1, cursorKind)
      : "";

  return (
    <div className={className}>
      <svg
        ref={svg}
        role="img"
        aria-label={label}
        viewBox={`${-GAP} ${-GAP} ${width} ${height}`}
        className={`block h-auto w-full ${onPaint ? "cursor-crosshair touch-manipulation select-none focus-visible:outline-none" : ""}`}
        {...painting}
      >
        {tiles.map((kind, index) => (
          <rect
            key={index}
            data-tile={kind}
            x={x(index)}
            y={y(index)}
            width={TILE}
            height={TILE}
            rx={10}
            fill={(kind === "floor" && floorTones?.[index]) || tileTone(kind)}
            stroke="var(--color-hairline)"
          />
        ))}
        {tiles.map((kind, index) => {
          const mark = kind === "floor" ? valueMark(floorValues?.[index] ?? 0) : tileMark(kind);
          if (!mark) return null;
          return (
            <path
              key={index}
              data-mark={"name" in mark ? mark.name : mark.sign}
              d={mark.path}
              transform={`translate(${x(index)} ${y(index)}) scale(${TILE})`}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        })}
        {overlay &&
          tiles.map((_, index) => (
            <g key={index} pointerEvents="none">
              {overlay({ index, x: x(index), y: y(index), size: TILE })}
            </g>
          ))}
        {piece && (
          <motion.g
            data-piece="puppy"
            data-skid={skid || undefined}
            pointerEvents="none"
            initial={false}
            animate={{
              x: centre(piece.column) - GAP / 2,
              y: centre(piece.row) - GAP / 2,
              rotate: skid ? 14 : 0,
            }}
            transition={transition}
          >
            <Puppy skid={skid} />
          </motion.g>
        )}
        {cursor !== null && (
          <g data-cursor pointerEvents="none" fill="none">
            <rect
              x={x(cursor) - 1.5}
              y={y(cursor) - 1.5}
              width={TILE + 3}
              height={TILE + 3}
              rx={11.5}
              stroke="var(--color-ink)"
              strokeWidth={3}
            />
            <rect
              x={x(cursor) + 1.5}
              y={y(cursor) + 1.5}
              width={TILE - 3}
              height={TILE - 3}
              rx={8.5}
              stroke="var(--color-accent)"
              strokeWidth={3}
            />
          </g>
        )}
      </svg>
      {onPaint && words && (
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

/** The learner: a small puppy's head in ink, so it reads without colour (A11Y-24). */
function Puppy({ skid }: { skid: boolean }) {
  return (
    <>
      {skid && (
        <g data-skid-marks stroke="var(--color-ink-soft)" strokeWidth={1.5} strokeLinecap="round">
          <line x1={-17} y1={-5} x2={-12} y2={-5} />
          <line x1={-19} y1={0} x2={-13} y2={0} />
          <line x1={-17} y1={5} x2={-12} y2={5} />
        </g>
      )}
      <ellipse
        cx={-8}
        cy={-3}
        rx={3.5}
        ry={6.5}
        transform="rotate(20 -8 -3)"
        fill="var(--color-ink-soft)"
      />
      <ellipse
        cx={8}
        cy={-3}
        rx={3.5}
        ry={6.5}
        transform="rotate(-20 8 -3)"
        fill="var(--color-ink-soft)"
      />
      <circle r={8.5} cy={1} fill="var(--color-ink)" />
      <ellipse cx={0} cy={5} rx={4} ry={3} fill="var(--color-card)" />
      <circle cx={0} cy={3.6} r={1.4} fill="var(--color-ink)" />
      <circle cx={-3.2} cy={-1} r={1.3} fill="var(--color-card)" />
      <circle cx={3.2} cy={-1} r={1.3} fill="var(--color-card)" />
    </>
  );
}
