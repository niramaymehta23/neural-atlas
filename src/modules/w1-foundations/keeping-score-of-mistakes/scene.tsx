"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  cost,
  dotsFor,
  groupMisses,
  isFinished,
  keyOf,
  lineAt,
  lineOf,
  power,
  rareCount,
  scoreRun,
  type ScoreFrame,
  type ScoreState,
} from "./model";

type Props = ModuleViewProps<ScoreState, ScoreFrame>;

const VIEW = 200;
const toView = (value: number) => ((value + 1) / 2) * VIEW;
/** A cost square's side for a cost of one, and the biggest side drawn. */
const SIDE = 6;
const BIGGEST = 56;
const DOT = 3.5;

export const missWord = (miss: number) =>
  miss < 0.05 ? words.missWords.close : miss < 0.15 ? words.missWords.near : words.missWords.far;

export const strictWord = (strict: number) => {
  const p = power(strict);
  return p <= 1.4 ? words.strict.gentle : p < 3 ? words.strict.middle : words.strict.strict;
};

export const rareWord = (rare: number) => {
  const many = rareCount(rare);
  return many === 0 ? words.rareWords.none : words.rareWords.some(count(many), many === 1);
};

/** Where the line is: waiting for its first walk, walking (or about to walk again for new dials), or settled. */
export function stage(state: ScoreState, frame: ScoreFrame | undefined) {
  if (state.runs === 0) return "waiting" as const;
  return isFinished(state, frame) ? ("done" as const) : ("walking" as const);
}

/** The dots, the line, and a square on every dot as big as its miss costs. */
export function ScoreScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: scoreRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 })),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  if (failure) throw failure;

  const frame = timeline.at(cursor);
  const line = lineOf(state, frame);
  const p = power(state.strict);
  const dots = dotsFor(state);
  const now = stage(state, frame);

  return (
    <div className="flex grow flex-col gap-3" data-testid="keeping-score-of-mistakes">
      <p className="text-xs text-ink-soft">{words.key}</p>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={words.fieldLabel(rareWord(state.rare), missWord(groupMisses(state, line).main))}
        className="mx-auto block aspect-square w-full max-w-md rounded-card border border-hairline bg-card"
      >
        {dots.map((dot, index) => {
          const side = Math.min(BIGGEST, SIDE * Math.sqrt(cost(lineAt(line, dot.x) - dot.y, p)));
          return (
            <rect
              key={index}
              x={toView(dot.x) - side / 2}
              y={toView(-dot.y) - side / 2}
              width={side}
              height={side}
              fill="var(--color-accent)"
              fillOpacity={0.25}
              stroke="var(--color-ink-soft)"
              strokeWidth={0.8}
              data-cost={side.toFixed(1)}
              data-rare={dot.rare || undefined}
            />
          );
        })}
        {dots.map((dot, index) => (
          <line
            key={index}
            x1={toView(dot.x)}
            x2={toView(dot.x)}
            y1={toView(-dot.y)}
            y2={toView(-lineAt(line, dot.x))}
            stroke="var(--color-ink-soft)"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
        ))}
        <line
          x1={toView(-1)}
          y1={toView(-lineAt(line, -1))}
          x2={toView(1)}
          y2={toView(-lineAt(line, 1))}
          stroke="var(--color-ink)"
          strokeWidth={3}
          strokeLinecap="round"
          data-line={`${line.slope.toFixed(2)},${line.height.toFixed(2)}`}
        />
        {dots.map((dot, index) =>
          dot.rare ? (
            <rect
              key={index}
              x={toView(dot.x) - DOT}
              y={toView(-dot.y) - DOT}
              width={DOT * 2}
              height={DOT * 2}
              transform={`rotate(45 ${toView(dot.x)} ${toView(-dot.y)})`}
              fill="var(--color-paper)"
              stroke="var(--color-ink)"
              strokeWidth={1.5}
              data-dot="rare"
            />
          ) : (
            <circle
              key={index}
              cx={toView(dot.x)}
              cy={toView(-dot.y)}
              r={DOT}
              fill="var(--color-ink)"
              data-dot="main"
            />
          ),
        )}
      </svg>
      <p className="min-h-10 text-sm" data-stage={now}>
        {words.showing[now]}
      </p>
    </div>
  );
}
