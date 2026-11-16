"use client";

import { motion } from "motion/react";
import { tileTone, type TileKind } from "@/design/encodings";
import { useSpring } from "@/design/motion";

type BoardProps = {
  columns: number;
  /** Row by row, `columns` per row. */
  tiles: readonly TileKind[];
  /** Where the learner stands. */
  piece?: { row: number; column: number };
  /** Plain description, such as "A small garden with a bone in the far corner". */
  label: string;
  className?: string;
};

const CELL = 48;
const GAP = 4;

/** A cosy board-game grid (RL worlds stay 2D). The learner hops between squares with a spring. */
export function Board({ columns, tiles, piece, label, className = "" }: BoardProps) {
  const transition = useSpring("settle");
  const rows = Math.ceil(tiles.length / columns);
  const centre = (index: number) => index * CELL + CELL / 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-GAP} ${-GAP} ${columns * CELL + GAP} ${rows * CELL + GAP}`}
      className={className}
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
          fill={tileTone(kind)}
          stroke="var(--color-hairline)"
        />
      ))}
      {piece && (
        <motion.circle
          r={CELL / 4}
          fill="var(--color-accent)"
          initial={false}
          animate={{ cx: centre(piece.column) - GAP / 2, cy: centre(piece.row) - GAP / 2 }}
          transition={transition}
        />
      )}
    </svg>
  );
}
