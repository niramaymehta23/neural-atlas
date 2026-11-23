"use client";

import { MEND_SIZES, THREADS } from "@/engine/lab/mend-run";
import { NetworkView } from "@/visuals/NetworkView";
import { layoutNeurons, type Point } from "@/visuals/network-layout";
import { HIDDEN } from "./model";

const WIDTH = 360;
const HEIGHT = 400;
const NEURONS = layoutNeurons(MEND_SIZES, WIDTH, HEIGHT);
const ORIGIN: Point = [0, 0];
/** A tap this close to a thread (in picture units) means that thread. */
const REACH = 18;

/** Both ends of a thread, by its number (the order NetworkView draws them in). */
function endsOf(thread: number): readonly [Point, Point] {
  const inward = thread < HIDDEN * 2;
  const cell = inward ? Math.floor(thread / 2) : thread - HIDDEN * 2;
  const at = NEURONS[1]?.[cell] ?? ORIGIN;
  return inward ? [NEURONS[0]?.[thread % 2] ?? ORIGIN, at] : [at, NEURONS[2]?.[0] ?? ORIGIN];
}

/** The visible part of a thread, clear of the cells at its ends. */
function shortened([from, to]: readonly [Point, Point]): readonly [Point, Point] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  const clear = 13 / length;
  const between = (along: number): Point => [
    from[0] + (to[0] - from[0]) * along,
    from[1] + (to[1] - from[1]) * along,
  ];
  return [between(clear), between(1 - clear)];
}

/** Crosses sit off the middle, where fewer threads cross each other. */
function crossOf(thread: number): Point {
  const [from, to] = endsOf(thread);
  const along = thread < HIDDEN * 2 ? 0.68 : 0.32;
  return [from[0] + (to[0] - from[0]) * along, from[1] + (to[1] - from[1]) * along];
}

/** The thread nearest a spot, if one is close enough. */
export function threadNear(x: number, y: number): number | null {
  let best: number | null = null;
  let least = REACH;
  for (let thread = 0; thread < THREADS; thread += 1) {
    const [[x1, y1], [x2, y2]] = endsOf(thread);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const along = Math.min(
      1,
      Math.max(0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)),
    );
    const distance = Math.hypot(x - x1 - dx * along, y - y1 - dy * along);
    if (distance < least) {
      least = distance;
      best = thread;
    }
  }
  return best;
}

type TeamThreadsProps = {
  params: Float64Array | null;
  cuts: readonly number[];
  /** Cells sent to practise. */
  cells: readonly number[];
  label: string;
  flowing: boolean;
  /** A thread was tapped. (The buttons beside the picture do the same.) */
  onThread?: (thread: number) => void;
};

/** The team being broken and mended: numbered cells, with a cross on each cut thread. */
export function TeamThreads({ params, cuts, cells, label, flowing, onThread }: TeamThreadsProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-sm"
      onPointerUp={
        onThread &&
        ((event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const thread = threadNear(
            ((event.clientX - box.left) / box.width) * WIDTH,
            ((event.clientY - box.top) / box.height) * HEIGHT,
          );
          if (thread !== null) onThread(thread);
        })
      }
    >
      <NetworkView
        sizes={MEND_SIZES}
        params={params}
        label={label}
        flowing={flowing}
        backward
        width={WIDTH}
        height={HEIGHT}
        className="w-full"
      />
      <svg
        aria-hidden
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="pointer-events-none absolute inset-0 size-full"
      >
        {cuts.map((thread) => {
          const [from, to] = shortened(endsOf(thread));
          const [x, y] = crossOf(thread);
          return (
            <g key={thread} data-cut={thread}>
              <line
                x1={from[0]}
                y1={from[1]}
                x2={to[0]}
                y2={to[1]}
                stroke="var(--color-card)"
                strokeWidth={7}
              />
              <line
                x1={from[0]}
                y1={from[1]}
                x2={to[0]}
                y2={to[1]}
                stroke="var(--color-ink)"
                strokeWidth={1}
                strokeDasharray="1 5"
              />
              <circle cx={x} cy={y} r={10} fill="var(--color-card)" stroke="var(--color-ink)" />
              <path
                d={`M${x - 4.5},${y - 4.5}L${x + 4.5},${y + 4.5}M${x + 4.5},${y - 4.5}L${x - 4.5},${y + 4.5}`}
                stroke="var(--color-ink)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </g>
          );
        })}
        {NEURONS[1]?.map(([x, y], cell) => (
          <g key={cell}>
            {cells.includes(cell) && (
              <circle
                data-picked={cell}
                cx={x}
                cy={y}
                r={17}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={2.5}
              />
            )}
            <text
              x={x}
              y={y}
              dy="0.35em"
              textAnchor="middle"
              className="fill-ink text-sm"
              stroke="var(--color-card)"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {cell + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
