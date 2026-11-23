"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { useSpring } from "@/design/motion";
import { cellAt, COLUMNS, ROWS, winningLine, type Board } from "@/engine/rl/connect-four";
import { Disc, RADIUS } from "./Disc";
import { words } from "./captions";
import { IT, roomIn, YOU } from "./model";

/** One hole is this many units wide; the row above the board holds the markers. */
const CELL = 20;
const TOP = 14;
const WIDTH = COLUMNS * CELL;
const HEIGHT = TOP + ROWS * CELL;

const centre = (column: number, row: number) => ({
  x: column * CELL + CELL / 2,
  y: TOP + (ROWS - 1 - row) * CELL + CELL / 2,
});

type FourBoardProps = {
  board: Board;
  /** The newest disc's column, which drops in (reduced motion: it is simply there). */
  newest: number | null;
  /** The column its thinking picks, marked above the board. */
  pick: number | null;
  /** Called with a column when the learner taps or presses Enter on it; absent: look only. */
  onColumn?: (column: number) => void;
  /** True when a drop would be played now (your turn). */
  open: boolean;
};

/**
 * The flat board: seven columns of six holes, with a button over each column. Arrow keys move
 * between the columns and Enter drops; a tap drops at once and a swipe still scrolls the page.
 */
export function FourBoard({ board, newest, pick, onColumn, open }: FourBoardProps) {
  const fall = useSpring("settle");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState(3);
  const [pointing, setPointing] = useState<number | null>(null);
  const line = winningLine(board);
  const hand = open ? (pointing ?? null) : null;

  const onKeyDown = (event: KeyboardEvent, column: number) => {
    const next =
      event.key === "ArrowLeft"
        ? column - 1
        : event.key === "ArrowRight"
          ? column + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? COLUMNS - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = Math.min(COLUMNS - 1, Math.max(0, next));
    setFocused(target);
    buttons.current[target]?.focus();
  };

  const discs = [];
  for (let row = 0; row < ROWS; row += 1)
    for (let column = 0; column < COLUMNS; column += 1) {
      const player = cellAt(board, column, row);
      if (player !== YOU && player !== IT) continue;
      const { x, y } = centre(column, row);
      const top = column === newest && row === (board.heights[column] ?? 0) - 1;
      discs.push(
        <motion.g
          key={`${column}-${row}`}
          initial={top ? { y: -(y - TOP / 2) } : false}
          animate={{ y: 0 }}
          transition={fall}
        >
          <Disc player={player} x={x} y={y} />
        </motion.g>,
      );
    }

  return (
    <div className="relative mx-auto w-full max-w-md" data-board>
      <svg
        role="img"
        aria-label={words.board}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
      >
        <rect x={0} y={TOP} width={WIDTH} height={ROWS * CELL} rx={6} fill="var(--color-inset)" />
        {Array.from({ length: ROWS * COLUMNS }, (_, index) => {
          const { x, y } = centre(index % COLUMNS, Math.floor(index / COLUMNS));
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={RADIUS}
              fill="var(--color-paper)"
              stroke="var(--color-hairline)"
              strokeWidth={0.8}
            />
          );
        })}
        {discs}
        {line.length > 0 && (
          <g data-winning>
            <path
              d={line
                .map(([column, row], at) => {
                  const { x, y } = centre(column, row);
                  return `${at === 0 ? "M" : "L"}${x} ${y}`;
                })
                .join("")}
              stroke="var(--color-paper)"
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={line
                .map(([column, row], at) => {
                  const { x, y } = centre(column, row);
                  return `${at === 0 ? "M" : "L"}${x} ${y}`;
                })
                .join("")}
              stroke="var(--color-ink)"
              strokeWidth={2.2}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}
        {pick !== null && pick >= 0 && (
          <path
            data-pick={pick}
            d={`M${pick * CELL + CELL / 2 - 5} 3L${pick * CELL + CELL / 2 + 5} 3L${pick * CELL + CELL / 2} 11Z`}
            fill="var(--color-ink)"
          />
        )}
        {hand !== null && pick !== hand && (
          <g opacity={0.6} data-hand={hand}>
            <Disc player={YOU} x={hand * CELL + CELL / 2} y={TOP / 2} r={5.5} />
          </g>
        )}
      </svg>
      {onColumn && (
        <div
          role="group"
          aria-label={words.columnsLabel}
          className="absolute inset-0 grid grid-cols-7"
          onPointerLeave={() => setPointing(null)}
        >
          {Array.from({ length: COLUMNS }, (_, column) => {
            const room = roomIn(board, column);
            return (
              <button
                key={column}
                ref={(button) => {
                  buttons.current[column] = button;
                }}
                type="button"
                data-column={column}
                tabIndex={column === focused ? 0 : -1}
                aria-label={words.column(column, room)}
                aria-disabled={!open || room === 0}
                onClick={() => onColumn(column)}
                onKeyDown={(event) => onKeyDown(event, column)}
                onFocus={() => {
                  setFocused(column);
                  setPointing(column);
                }}
                onPointerEnter={() => setPointing(column)}
                className="rounded-control focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-ink"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
