"use client";

import { motion } from "motion/react";
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { tileTone, type TileKind } from "@/design/encodings";
import { useSpring } from "@/design/motion";

/** Where a square sits in the board's own coordinates, for drawing on top of it. */
export type Square = { index: number; x: number; y: number; size: number };

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
  /** Drawn over each square, under the learner (score arrows). */
  overlay?: (square: Square) => ReactNode;
  /** Makes the board paintable: tap or drag across squares, or arrows then Enter. */
  onPaint?: (index: number) => void;
  className?: string;
};

export const CELL = 48;
const GAP = 4;

/** A cosy board-game grid (RL worlds stay 2D). The learner hops between squares with a spring. */
export function Board({
  columns,
  tiles,
  piece,
  label,
  floorTones,
  overlay,
  onPaint,
  className = "",
}: BoardProps) {
  const transition = useSpring("settle");
  const [cursor, setCursor] = useState<number | null>(null);
  const rows = Math.ceil(tiles.length / columns);
  const centre = (index: number) => index * CELL + CELL / 2;
  const width = columns * CELL + GAP;
  const height = rows * CELL + GAP;

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
    const at = cursor ?? 0;
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
    onKeyDown,
    onBlur: () => setCursor(null),
    onPointerDown: (event: PointerEvent<SVGSVGElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      paint(event);
    },
    onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) paint(event);
    },
  };

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-GAP} ${-GAP} ${width} ${height}`}
      className={`${onPaint ? "cursor-crosshair touch-none" : ""} ${className}`}
      {...painting}
    >
      {tiles.map((kind, index) => (
        <rect
          key={index}
          data-tile={kind}
          x={(index % columns) * CELL}
          y={Math.floor(index / columns) * CELL}
          width={CELL - GAP}
          height={CELL - GAP}
          rx={10}
          fill={(kind === "floor" && floorTones?.[index]) || tileTone(kind)}
          stroke={cursor === index ? "var(--color-accent)" : "var(--color-hairline)"}
        />
      ))}
      {overlay &&
        tiles.map((_, index) => (
          <g key={index} pointerEvents="none">
            {overlay({
              index,
              x: (index % columns) * CELL,
              y: Math.floor(index / columns) * CELL,
              size: CELL - GAP,
            })}
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
    </svg>
  );
}
