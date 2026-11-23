"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { useReducedMotion } from "@/design/motion";
import { MOST_STEPS, SPEED } from "@/engine/rl/racers";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type BoardWords, type Square } from "@/visuals/Board";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  COLUMNS,
  gainOf,
  GENERATIONS,
  GRASS,
  hasWayRound,
  isFinished,
  keyOf,
  raceRun,
  ROAD,
  ROWS,
  STALL,
  START,
  trackOf,
  type RaceFrame,
  type RaceState,
} from "./model";
import { RaceCars } from "./RaceCars";

type Props = ModuleViewProps<RaceState, RaceFrame>;

const SQUARES = COLUMNS * ROWS;
const LAST = SQUARES - 1;
const FLOOR = Array.from({ length: SQUARES }, () => "floor" as const);
/** The chart's fixed top: a little more than a car can drive in its time, in squares. */
const CHART_TOP = Math.ceil(MOST_STEPS * SPEED * 1.3);

/** How far the best car got, in words (with laps once it has gone round). */
export function furthestLine(frame: Pick<RaceFrame, "furthest" | "lap">) {
  const laps = Math.floor(frame.furthest / Math.max(1, frame.lap));
  return laps > 0
    ? `${words.furthest(frame.furthest)} ${words.laps(laps)}`
    : words.furthest(frame.furthest);
}

/** Tufts on grass squares and stripes on the start line, so neither is told by colour alone. */
function Ground({ square, road }: { square: Square; road: string }) {
  const { x, y, size } = square;
  if (square.index === START)
    return (
      <g data-start-line stroke="var(--color-ink)" strokeWidth={2.5}>
        {[0, 1, 2, 3, 4].map((stripe) => (
          <line
            key={stripe}
            x1={x + size / 2}
            y1={y + 4 + stripe * 8}
            x2={x + size / 2}
            y2={y + 8 + stripe * 8}
          />
        ))}
      </g>
    );
  if (road[square.index] === ROAD) return null;
  return (
    <g data-grass>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={10}
        fill="var(--color-good)"
        fillOpacity={0.35}
      />
      <path
        d={`M${x + 12} ${y + 30} l2 -7 l2 7 M${x + 26} ${y + 20} l2 -7 l2 7 M${x + 30} ${y + 34} l2 -7 l2 7`}
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** The track you draw, the cars of the race on show, and how far the best car got race by race. */
export function RaceScene(props: Props) {
  const { state, update, timeline, side } = props;
  const reduced = useReducedMotion();
  const wayRound = hasWayRound(state.road);
  const rerun = useCallback(() => {
    // A track with no way round runs nothing: the scene says why instead.
    if (wayRound) update(({ runs }) => ({ runs: runs + 1 }), { touch: false });
  }, [update, wayRound]);
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: raceRun,
    settings: keyOf(state),
    rerun,
  });
  const { cursor, playing } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const track = useMemo(() => trackOf(state.road), [state.road]);
  if (failure) throw failure;

  const furthests = ours
    ? timeline
        .frames()
        .filter((frame) => frame.key === ours.key)
        .map((frame) => frame.furthest)
    : [];
  const stuck = isFinished(state, ours) && gainOf(ours) <= STALL;

  const paint = (index: number) => {
    if (index === START) return;
    const mark = state.brush === "road" ? ROAD : GRASS;
    if (state.road[index] === mark) return;
    // Painting changes the track as it is now, so a scrubbed-back view jumps to now first.
    if (!timeline.getState().live) timeline.goLive();
    update(({ road }) => ({
      road: [...road].map((now, at) => (at === index ? mark : now)).join(""),
    }));
  };
  const boardWords: BoardWords = {
    instructions: words.paint.instructions,
    square: (row, column) => {
      const index = (row - 1) * COLUMNS + (column - 1);
      const kind =
        index === START
          ? words.paint.start
          : state.road[index] === ROAD
            ? words.paint.road
            : words.paint.grass;
      return words.paint.square(count(row), count(column), kind);
    },
  };

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="survival-of-the-fittest"
      data-generation={ours ? ours.generation + 1 : 0}
      data-furthest={ours?.furthest}
      data-stuck={stuck ? "" : undefined}
    >
      <Board
        columns={COLUMNS}
        tiles={FLOOR}
        label={words.board}
        floorTones={[...state.road].map((mark, at) =>
          mark === ROAD || at === START ? "var(--color-inset)" : "var(--color-card)",
        )}
        overlay={(square) => (
          <>
            <Ground square={square} road={state.road} />
            {square.index === LAST && ours && (
              <RaceCars
                frame={ours}
                track={track}
                square={square}
                driving={!reduced && !playing && side === "main"}
              />
            )}
          </>
        )}
        onPaint={side === "main" ? paint : undefined}
        words={boardWords}
        className="mx-auto w-full max-w-xl"
      />
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-32 flex-col gap-1 text-sm" data-status>
        {!wayRound ? (
          <p data-no-way className="font-medium">
            {words.noWay}
          </p>
        ) : ours ? (
          <>
            <p>{words.generation(ours.generation, GENERATIONS)}</p>
            <p data-furthest-line>{furthestLine(ours)}</p>
            {ours.generation > 0 && <p>{words.first(ours.firstFurthest)}</p>}
            <p>
              {words.crashed(ours.crashed.filter((crashed) => crashed).length, ours.crashed.length)}
            </p>
            {stuck && <p className="font-medium">{words.stuck}</p>}
          </>
        ) : (
          <p>{words.waiting}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Chart
          series={[{ values: furthests }]}
          label={words.chart}
          marker={ours ? Math.min(furthests.length - 1, ours.generation) : undefined}
          range={{ min: 0, max: CHART_TOP }}
          className="h-20 w-full"
        />
        <p className="text-sm text-ink-soft">{words.chartNote}</p>
      </div>
    </div>
  );
}
