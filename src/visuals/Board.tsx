"use client";

import { motion } from "motion/react";
import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
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
  /** Where the learner stands. */
  piece?: { row: number; column: number };
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

/** A cosy board-game grid (RL worlds stay 2D). The learner hops between squares with a spring. */
export function Board({
  columns,
  tiles,
  piece,
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
  const rows = Math.ceil(tiles.length / columns);
  const centre = (index: number) => index * CELL + CELL / 2;
  const width = columns * CELL + GAP;
  const height = rows * CELL + GAP;
  const home = piece ? piece.row * columns + piece.column : 0;
  const x = (index: number) => (index % columns) * CELL;
  const y = (index: number) => Math.floor(index / columns) * CELL;

  const squareAt = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return null;
    const column = Math.floor((((event.clientX - box.left) / box.width) * width - GAP) / CELL);
    const row = Math.floor((((event.clientY - box.top) / box.height) * height - GAP) / CELL);
    return column < 0 || column >= columns || row < 0 || row >= rows
      ? null
      : row * columns + column;
  };
  const paint = (event: PointerEvent<SVGSVGElement>) => {
    const index = squareAt(event);
    if (index !== null) onPaint?.(index);
  };
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
      event.currentTarget.setPointerCapture(event.pointerId);
      paint(event);
    },
    onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) paint(event);
    },
  };
  const cursorKind = cursor === null ? undefined : tiles[cursor];
  const spoken =
    cursor !== null && cursorKind && words
      ? words.square(Math.floor(cursor / columns) + 1, (cursor % columns) + 1, cursorKind)
      : "";

  return (
    <div className={className}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`${-GAP} ${-GAP} ${width} ${height}`}
        className={`block h-auto w-full ${onPaint ? "cursor-crosshair touch-none focus-visible:outline-none" : ""}`}
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
          <motion.circle
            r={CELL / 4}
            fill="var(--color-accent)"
            pointerEvents="none"
            initial={false}
            animate={{ cx: centre(piece.column) - GAP / 2, cy: centre(piece.row) - GAP / 2 }}
            transition={transition}
          />
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
