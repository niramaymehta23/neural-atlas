"use client";

import { useId, useMemo, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { count } from "@/design/copy";
import { linePath } from "@/design/encodings";
import { useHoldDrag, type DragPoint } from "@/features/building/use-hold-drag";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  CLOSE,
  COLUMNS,
  drawRun,
  FAR,
  isFinished,
  keyOf,
  lineOf,
  type DrawFrame,
  type DrawState,
} from "./model";

type Props = ModuleViewProps<DrawState, DrawFrame>;

const WIDTH = 320;
const HEIGHT = 200;
const PAD = 12;
const RANGE = { min: -1.2, max: 1.2 };
const NUDGE = 0.1;
const SPOT = WIDTH / COLUMNS;
const toX = (column: number) => (column + 0.5) * SPOT;
const toY = (height: number) =>
  HEIGHT - PAD - ((height - RANGE.min) / (RANGE.max - RANGE.min)) * (HEIGHT - 2 * PAD);
const fromY = (y: number) =>
  RANGE.min + ((HEIGHT - PAD - y) / (HEIGHT - 2 * PAD)) * (RANGE.max - RANGE.min);
const tidy = (height: number) => Math.round(Math.min(1, Math.max(-1, height)) * 100) / 100;

/** How close the finished line is to the squiggle, in words. */
export function howClose(state: DrawState, frame: DrawFrame | undefined) {
  if (!isFinished(state, frame)) return words.howClose.waiting;
  return frame.loss <= CLOSE
    ? words.howClose.close
    : frame.loss < FAR
      ? words.howClose.near
      : words.howClose.far;
}

/** The squiggle the learner draws, and the line the cells draw over it. */
export function DrawScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: drawRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const line = useMemo(() => (ours ? lineOf(state.cells, ours.params) : null), [ours, state.cells]);
  const [spot, setSpot] = useState<number | null>(null);
  const instructionsId = useId();

  const setHeight = (column: number, height: number) =>
    update(({ heights }) => ({
      heights: heights.map((value, index) => (index === column ? tidy(height) : value)),
    }));
  const { ref, handlers } = useHoldDrag<SVGSVGElement>({
    onDrag: (point) => drawAt(point),
    onTap: (point) => drawAt(point),
  });
  function drawAt(point: DragPoint) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const column = Math.floor(((point.clientX - box.left) / box.width) * COLUMNS);
    if (column < 0 || column >= COLUMNS) return;
    setHeight(column, fromY(((point.clientY - box.top) / box.height) * HEIGHT));
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const at = spot ?? 0;
    const height = state.heights[at] ?? 0;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => setSpot(Math.max(0, at - 1)),
      ArrowRight: () => setSpot(Math.min(COLUMNS - 1, at + 1)),
      ArrowUp: () => setHeight(at, height + NUDGE),
      ArrowDown: () => setHeight(at, height - NUDGE),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };
  if (failure) throw failure;

  const at = spot ?? 0;
  const atHeight = state.heights[at] ?? 0;
  const squiggle = state.heights.map((height, column) => `${toX(column)},${toY(height)}`).join(" ");
  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="it-can-draw-anything"
      data-epoch={ours?.epoch ?? 0}
    >
      <figure className="flex flex-col gap-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label={words.draw.label}
          aria-describedby={instructionsId}
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={atHeight}
          aria-valuetext={words.draw.spot(
            count(at + 1),
            count(COLUMNS),
            words.draw.height(atHeight),
          )}
          onKeyDown={onKeyDown}
          onFocus={() => setSpot((now) => now ?? 0)}
          onBlur={() => setSpot(null)}
          className="rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <svg
            ref={ref}
            {...handlers}
            role="img"
            aria-label={words.picture}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block h-auto w-full cursor-crosshair touch-manipulation select-none rounded-card border border-hairline bg-paper"
            data-drawing
          >
            <line x1={0} x2={WIDTH} y1={toY(0)} y2={toY(0)} stroke="var(--color-hairline)" />
            {spot !== null && (
              <rect
                data-spot={spot}
                x={spot * SPOT}
                y={1}
                width={SPOT}
                height={HEIGHT - 2}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
            <polyline
              points={squiggle}
              fill="none"
              stroke="var(--color-ink-soft)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            {line && (
              <path
                d={linePath(
                  line.map((value) => Math.max(RANGE.min, Math.min(RANGE.max, value))),
                  WIDTH - SPOT,
                  HEIGHT - 2 * PAD,
                  RANGE,
                )}
                transform={`translate(${SPOT / 2} ${PAD})`}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={3}
                strokeLinejoin="round"
                data-cells-line
              />
            )}
            {state.heights.map((height, column) => (
              <circle
                key={column}
                cx={toX(column)}
                cy={toY(height)}
                r={3.5}
                fill="var(--color-flow)"
                stroke="var(--color-ink)"
                strokeWidth={1}
              />
            ))}
          </svg>
        </div>
        <p id={instructionsId} hidden>
          {words.draw.instructions}
        </p>
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
              <line
                x1={0}
                x2={16}
                y1={5}
                y2={5}
                stroke="var(--color-ink-soft)"
                strokeDasharray="4 2"
              />
              <circle cx={8} cy={5} r={3} fill="var(--color-flow)" stroke="var(--color-ink)" />
            </svg>
            {words.key.squiggle}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
              <line x1={0} x2={16} y1={5} y2={5} stroke="var(--color-ink)" strokeWidth={3} />
            </svg>
            {words.key.line}
          </span>
        </figcaption>
      </figure>
      {/* A reserved line, so the page does not jump when the words change. */}
      <p className="min-h-10 text-sm" data-how-close>
        {howClose(state, ours)}
      </p>
    </div>
  );
}
