"use client";

import { motion } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";
import { useSpring } from "@/design/motion";
import { BOXED, CARRIED, type RoomSquare } from "@/engine/rl/reward-design";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  ALL_LOOPHOLES,
  dayRun,
  keyOf,
  ROOM,
  withFound,
  type LoopholeFrame,
  type LoopholeState,
} from "./model";

type Props = ModuleViewProps<LoopholeState, LoopholeFrame>;

const CELL = 48;
const GAP = 4;
const TILE = CELL - GAP;
const WIDTH = ROOM.columns * CELL + GAP;
const HEIGHT = ROOM.rows * CELL + GAP;
const x = (cell: number) => (cell % ROOM.columns) * CELL;
const y = (cell: number) => Math.floor(cell / ROOM.columns) * CELL;
const middle = (cell: number) => ({ x: x(cell) + TILE / 2, y: y(cell) + TILE / 2 });
const boxCell = ROOM.squares.indexOf("box");

/** The day's treats-minus-costs line is drawn on this fixed scale (clamped), so it never jumps. */
const TOTAL_RANGE = { min: -3, max: 3 };

/** A cut-paper glyph for each special square, in ink on a 44-unit square, so none needs colour. */
function SquareGlyph({ square }: { square: RoomSquare }) {
  if (square === "bed")
    return (
      <g
        data-square="bed"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.6}
        strokeLinecap="round"
      >
        <rect x={8} y={18} width={28} height={12} rx={3} fill="var(--color-card)" />
        <rect x={10} y={14} width={9} height={6} rx={2} fill="var(--color-paper)" />
        <path d="M8 30 V34 M36 30 V34" />
      </g>
    );
  if (square === "puddle")
    return (
      <g
        data-square="puddle"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.6}
        strokeLinecap="round"
      >
        <path d="M10 18 Q16 13 22 18 T34 18 M10 26 Q16 21 22 26 T34 26" />
      </g>
    );
  if (square === "box")
    return (
      <g
        data-square="box"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.6}
        strokeLinejoin="round"
      >
        <path d="M10 18 H34 L31 34 H13 Z" fill="var(--color-card)" />
        <path d="M10 18 L6 12 M34 18 L38 12" />
      </g>
    );
  if (square === "wall")
    return (
      <path
        d="M9 15 H35 M9 22 H35 M9 29 H35 M18 15 V22 M26 22 V29"
        stroke="var(--color-ink)"
        strokeWidth={1.4}
        fill="none"
      />
    );
  return null;
}

const SQUARE_TONE: Record<RoomSquare, string> = {
  floor: "var(--color-card)",
  wall: "color-mix(in oklab, var(--color-ink-soft) 45%, var(--color-card))",
  bed: "var(--color-card)",
  puddle: "color-mix(in oklab, var(--color-flow) 40%, var(--color-card))",
  box: "color-mix(in oklab, var(--color-sand) 70%, var(--color-card))",
};

/** The toy: a striped ball in ink, so it reads without colour. */
function Toy({ at }: { at: { x: number; y: number } }) {
  return (
    <g data-piece="toy" transform={`translate(${at.x} ${at.y})`}>
      <circle r={6} fill="var(--color-sand)" stroke="var(--color-ink)" strokeWidth={1.4} />
      <path d="M-6 0 H6" stroke="var(--color-ink)" strokeWidth={1.4} />
    </g>
  );
}

/** The robot: a rounded head with an antenna and two eyes, in ink. */
function Robot() {
  return (
    <>
      <path d="M0 -13 V-9" stroke="var(--color-ink)" strokeWidth={1.6} strokeLinecap="round" />
      <circle cy={-14} r={2} fill="var(--color-ink)" />
      <rect x={-10} y={-9} width={20} height={17} rx={5} fill="var(--color-ink)" />
      <circle cx={-4} cy={-1} r={2} fill="var(--color-card)" />
      <circle cx={4} cy={-1} r={2} fill="var(--color-card)" />
      <path d="M-3 4 H3" stroke="var(--color-card)" strokeWidth={1.4} strokeLinecap="round" />
    </>
  );
}

/** The bedroom, the robot's day so far, what it is doing, and the loopholes found. */
export function LoopholeScene(props: Props) {
  const { state, update, timeline, side } = props;
  const transition = useSpring("settle");
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: dayRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const newest = timeline.at(length - 1);
  const day = newest && newest.key === keyOf(state) ? newest : undefined;

  // A day worked out for these settings that was a loophole is kept as found.
  useEffect(() => {
    if (side !== "main" || !day) return;
    update(
      (now) => {
        const found = withFound(now.found, day.behaviour);
        return found.length === now.found.length ? {} : { found };
      },
      { touch: false },
    );
  }, [day, side, update]);
  if (failure) throw failure;

  const cell = ours?.cell ?? ROOM.start;
  const toy = ours?.toy ?? ROOM.toy;
  const path = ours?.path ?? [];
  const totals = day ? timeline.frames().filter((frame) => frame.key === day.key) : [];

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="loopholes"
      data-moves={ours?.moves ?? 0}
      data-behaviour={day?.behaviour}
    >
      <svg
        role="img"
        aria-label={words.room}
        viewBox={`${-GAP} ${-GAP} ${WIDTH} ${HEIGHT}`}
        className="mx-auto block h-auto w-full max-w-lg"
      >
        {ROOM.squares.map((square, index) => (
          <g key={index} transform={`translate(${x(index)} ${y(index)})`}>
            <rect
              width={TILE}
              height={TILE}
              rx={10}
              fill={SQUARE_TONE[square]}
              stroke="var(--color-hairline)"
            />
            <SquareGlyph square={square} />
          </g>
        ))}
        {path.length > 1 && (
          <polyline
            data-path
            points={path.map((at) => `${middle(at).x},${middle(at).y}`).join(" ")}
            fill="none"
            stroke="var(--color-ink-soft)"
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeLinejoin="round"
          />
        )}
        {toy >= 0 && <Toy at={{ x: middle(toy).x + 10, y: middle(toy).y + 12 }} />}
        {toy === BOXED && <Toy at={{ x: middle(boxCell).x, y: middle(boxCell).y + 2 }} />}
        <motion.g
          data-piece="robot"
          initial={false}
          animate={{ x: middle(cell).x, y: middle(cell).y }}
          transition={transition}
        >
          <Robot />
          {toy === CARRIED && <Toy at={{ x: 10, y: 8 }} />}
        </motion.g>
      </svg>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <p className="min-h-5 text-sm text-ink-soft" data-now>
        {ours ? words.now[ours.happened] : words.waiting}
      </p>
      <p className="min-h-15 text-sm font-semibold" data-verdict={day ? day.behaviour : undefined}>
        {day ? words.behaviour[day.behaviour] : ""}
      </p>
      <figure className="flex flex-col gap-1">
        <Chart
          series={[
            {
              values: totals.map((frame) =>
                Math.min(TOTAL_RANGE.max, Math.max(TOTAL_RANGE.min, frame.total)),
              ),
            },
          ]}
          label={words.chart}
          marker={ours ? totals.indexOf(ours) : undefined}
          range={TOTAL_RANGE}
          baseline={0}
          className="h-16 w-full"
        />
        <figcaption aria-hidden className="text-xs text-ink-soft">
          {words.chart}
        </figcaption>
      </figure>
      <section className="flex flex-col gap-1 text-sm" data-found={state.found.length}>
        <h3 className="font-serif text-base">{words.found.title}</h3>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-3">
          {ALL_LOOPHOLES.map((loophole) => {
            const known = state.found.includes(loophole);
            return (
              <li
                key={loophole}
                data-loophole={loophole}
                data-known={known ? "" : undefined}
                className={`min-h-9 rounded-card border px-3 py-1.5 ${known ? "border-ink bg-paper" : "border-dashed border-ink-soft text-ink-soft"}`}
              >
                {known ? words.found[loophole] : words.found.missing}
              </li>
            );
          })}
        </ul>
        <p className="text-ink-soft">{words.found.tally(state.found.length)}</p>
      </section>
    </div>
  );
}
