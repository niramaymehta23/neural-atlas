"use client";

import { useId, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { PaintCanvas, type PaintWords } from "@/data/PaintCanvas";
import { useHoldDrag } from "@/features/building/use-hold-drag";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { snapToStep, valueForKey } from "@/ui/keyboard-step";
import { words } from "./captions";
import {
  allDots,
  baseDots,
  HANDLE_X,
  isThisWalk,
  lineAt,
  MAX_ADDED,
  meanMiss,
  roundDot,
  walkRun,
  type LineFrame,
  type LineState,
} from "./model";

type Props = ModuleViewProps<LineState, LineFrame>;
type Ends = { left: number; right: number };

const VIEW = 200;
const toView = (value: number) => ((value + 1) / 2) * VIEW;
/** The total-miss bar is full at this average squared miss. */
const FULL_MISS = 0.4;
const RANGE = { min: -1, max: 1, step: 0.02 };

const PAINT_WORDS: PaintWords = {
  instructions: words.paint.instructions,
  position: (across, up) => words.paint.position(String(across), String(up)),
  planted: (_group, across, up) => words.paint.planted(String(across), String(up)),
};

export const missWord = (miss: number) =>
  miss < 0.02 ? words.missWords.tiny : miss < 0.12 ? words.missWords.some : words.missWords.lots;

/** The line shown now: the walk's moment on screen, or the learner's own line. */
export function shownLine(state: LineState, frame: LineFrame | undefined): Ends {
  return isThisWalk(state, frame) ? { left: frame.left, right: frame.right } : state.line;
}

/** The dots, the learner's line with its two handles, and the miss bars. */
export function LineScene(props: Props) {
  const { state, update, timeline, side } = props;
  const main = side === "main";
  const { failure } = useRecordedRun({ ...props, runs: state.runs, work: walkRun });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const [full, setFull] = useState(false);
  const instructionsId = useId();
  if (failure) throw failure;

  const frame = timeline.at(cursor);
  const walking = isThisWalk(state, frame);
  const line = shownLine(state, frame);
  const base = baseDots(state);
  const dots = allDots(state);
  const points = [
    ...base.map((dot) => ({ ...dot, label: 0 })),
    ...state.added.map((dot) => ({ ...dot, label: 1 })),
  ];
  const miss = meanMiss(dots, line);
  const setEnd = (end: keyof Ends, value: number) =>
    update(({ line: now }) => ({ line: { ...now, [end]: value } }));

  return (
    <div className="flex grow flex-col gap-3" data-testid="drawing-the-best-line">
      <p className="text-xs text-ink-soft">{words.key}</p>
      <p id={instructionsId} className="sr-only">
        {words.handles.instructions}
      </p>
      <div className="relative mx-auto w-full max-w-md">
        <PaintCanvas
          label={words.field}
          words={PAINT_WORDS}
          points={points}
          group={1}
          onAdd={(dot) => {
            if (!main) return;
            const room = state.added.length < MAX_ADDED;
            setFull(!room);
            if (room)
              update(({ added }) => ({ added: [...added, roundDot(dot)].slice(0, MAX_ADDED) }));
          }}
        >
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full" aria-hidden>
            {dots.map((dot, index) => (
              <line
                key={index}
                x1={toView(dot.x)}
                x2={toView(dot.x)}
                y1={toView(-dot.y)}
                y2={toView(-lineAt(line, dot.x))}
                stroke="var(--color-ink-soft)"
                strokeWidth={1.2}
                data-miss
              />
            ))}
            {walking && (
              <line
                x1={toView(-1)}
                y1={toView(-lineAt(state.line, -1))}
                x2={toView(1)}
                y2={toView(-lineAt(state.line, 1))}
                stroke="var(--color-ink-soft)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
            <line
              x1={toView(-1)}
              y1={toView(-lineAt(line, -1))}
              x2={toView(1)}
              y2={toView(-lineAt(line, 1))}
              stroke="var(--color-ink)"
              strokeWidth={3}
              strokeLinecap="round"
              data-line={`${line.left.toFixed(2)},${line.right.toFixed(2)}`}
            />
          </svg>
        </PaintCanvas>
        {main &&
          (["left", "right"] as const).map((end) => (
            <Handle
              key={end}
              name={words.handles[end]}
              describedBy={instructionsId}
              value={state.line[end]}
              across={end === "left" ? -HANDLE_X : HANDLE_X}
              onChange={(value) => setEnd(end, value)}
            />
          ))}
      </div>
      <div className="flex min-h-20 flex-col gap-1 text-sm">
        <p data-showing={walking ? (frame?.epoch === frame?.steps ? "best" : "walking") : "yours"}>
          {walking
            ? frame?.epoch === frame?.steps
              ? words.showing.best
              : words.showing.walking
            : words.showing.yours}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-40 shrink-0 text-xs text-ink-soft">{words.totalMiss}</span>
          <span
            className="block h-3 grow overflow-hidden rounded-pill border border-hairline bg-card"
            role="img"
            aria-label={words.totalMissLabel(missWord(miss))}
          >
            <span
              className="block h-full bg-ink"
              style={{ width: `${(Math.min(1, miss / FULL_MISS) * 100).toFixed(1)}%` }}
              data-total-miss={miss.toFixed(3)}
            />
          </span>
        </div>
        {main && full && <p className="text-ink-soft">{words.full}</p>}
      </div>
    </div>
  );
}

/** A round handle holding one end of the line: drag it up or down, or use the arrow keys. */
function Handle({
  name,
  describedBy,
  value,
  across,
  onChange,
}: {
  name: string;
  describedBy: string;
  value: number;
  across: number;
  onChange: (value: number) => void;
}) {
  const { ref, handlers } = useHoldDrag<HTMLDivElement>({
    onDrag: ({ clientY }) => {
      const box = ref.current?.parentElement?.getBoundingClientRect();
      if (!box || box.height === 0) return;
      onChange(snapToStep(1 - ((clientY - box.top) / box.height) * 2, RANGE));
    },
  });
  const onKeyDown = (event: KeyboardEvent) => {
    const next = valueForKey(event.key, value, RANGE);
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };
  const least = RANGE.min;
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={name}
      aria-valuemin={least}
      aria-valuemax={RANGE.max}
      aria-valuenow={value}
      aria-valuetext={words.handles.height(String(Math.round(((value + 1) / 2) * 100)))}
      aria-describedby={describedBy}
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      {...handlers}
      className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-manipulation items-center justify-center rounded-full"
      style={{ left: `${((across + 1) / 2) * 100}%`, top: `${((1 - value) / 2) * 100}%` }}
      data-handle={across < 0 ? "left" : "right"}
    >
      <span className="block size-5 rounded-full border-2 border-ink bg-accent" />
    </div>
  );
}
