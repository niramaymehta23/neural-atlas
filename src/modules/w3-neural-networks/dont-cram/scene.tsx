"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count, outOf } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs, type Point } from "@/data/datasets";
import { chance, predict } from "@/engine/autodiff/dense";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  cramRun,
  FRESH,
  freshShare,
  keyOf,
  offCells,
  PRACTICE,
  practiceShare,
  specFor,
  type CramFrame,
  type CramState,
} from "./model";

type Props = ModuleViewProps<CramState, CramFrame>;

const FIELD = 32;
const GRID = gridInputs(FIELD);
const VIEW = 200;
const toView = (value: number) => ((value + 1) / 2) * VIEW;

const practiceScore = (frame: CramFrame) => outOf(practiceShare(frame), { total: PRACTICE.length });
const freshScore = (frame: CramFrame) => outOf(freshShare(frame), { total: FRESH.length });

/** Both scores of a finished run, in words (used by `describe`). */
export const scoresSentence = (frame: CramFrame) =>
  words.describe.done(practiceScore(frame), freshScore(frame));

function Dot({ point, hollow }: { point: Point; hollow: boolean }) {
  return (
    <path
      data-group={point.label}
      data-kind={hollow ? "fresh" : "practice"}
      d={markPath(classMark(point.label), toView(point.x), toView(-point.y), hollow ? 2.6 : 4)}
      fill={hollow ? "none" : classTone(point.label)}
      stroke={hollow ? "var(--color-ink-soft)" : "var(--color-ink)"}
      strokeWidth={hollow ? 1 : 0.9}
      strokeLinejoin="round"
    />
  );
}

/** The team as a row of cells; a crossed-out, dashed cell is switched off at this moment. */
function Team({ off, label }: { off: readonly boolean[]; label: string }) {
  // A fixed grid (two rows of sixteen), so the picture keeps its size as the team grows.
  const size = 22;
  const across = 16;
  const rows = Math.ceil(off.length / across);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${across * size} ${2 * size}`}
      className="h-auto w-full max-w-md"
      data-team
    >
      {off.map((isOff, index) => {
        const cx = (index % across) * size + size / 2;
        const cy = Math.floor(index / across) * size + size / 2 + (rows === 1 ? size / 2 : 0);
        return (
          <g key={index} data-off={isOff || undefined}>
            <circle
              cx={cx}
              cy={cy}
              r={size / 2 - 3}
              fill={isOff ? "var(--color-paper)" : "var(--color-flow)"}
              stroke={isOff ? "var(--color-ink-soft)" : "var(--color-ink)"}
              strokeWidth={1.2}
              strokeDasharray={isOff ? "2 2" : undefined}
            />
            {isOff && (
              <path
                d={`M${cx - 4} ${cy - 4} L${cx + 4} ${cy + 4} M${cx + 4} ${cy - 4} L${cx - 4} ${cy + 4}`}
                stroke="var(--color-ink-soft)"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** The dots and the team's guess, the team with its switched-off cells, and both scores. */
export function CramScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: cramRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  // The frame's own team size: the dial may have moved before the new run arrives.
  const team = shown ? (shown.params.length - 1) / 4 : state.team;
  const field = useMemo(
    () => (shown ? Float32Array.from(predict(specFor(team), shown.params, GRID), chance) : null),
    [shown, team],
  );
  // The frame's own share switched off, from the settings it was worked out for.
  const off = useMemo(
    () =>
      shown && shown.epoch > 0
        ? offCells({ off: Number(shown.key.split("|")[0]) || 0, team }, shown.epoch)
        : Array.from({ length: team }, () => false),
    [shown, team],
  );
  const offCount = off.filter(Boolean).length;
  const series = useMemo(() => {
    const frames = timeline.frames().slice(0, length);
    return [{ values: frames.map(practiceShare) }, { values: frames.map(freshShare), ghost: true }];
  }, [timeline, length]);
  if (failure) throw failure;

  return (
    <div className="flex grow flex-col gap-3" data-testid="dont-cram">
      <div
        role="img"
        aria-label={words.field}
        className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-card border border-hairline bg-paper"
      >
        <div className="absolute inset-0">
          <DecisionField outputs={field} groups={2} resolution={FIELD} />
        </div>
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full" aria-hidden>
          {FRESH.map((point, index) => (
            <Dot key={`fresh-${index}`} point={point} hollow />
          ))}
          {PRACTICE.map((point, index) => (
            <Dot key={`practice-${index}`} point={point} hollow={false} />
          ))}
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <li>{words.key.practice}</li>
        <li>{words.key.fresh}</li>
      </ul>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-12 flex-col gap-1 text-sm" data-scores>
        {shown ? (
          <>
            <p>{words.scores.practice(practiceScore(shown))}</p>
            <p>{words.scores.fresh(freshScore(shown))}</p>
          </>
        ) : (
          <p className="text-ink-soft">{words.scores.waiting}</p>
        )}
      </div>
      <section className="flex flex-col gap-1" aria-label={words.team.title}>
        <h3 className="text-sm text-ink-soft">{words.team.title}</h3>
        <Team off={off} label={words.team.label(count(offCount), count(team))} />
        <p className="min-h-10 text-xs text-ink-soft">
          {shown && shown.epoch > 0 ? words.team.moment(count(offCount)) : words.team.before}
        </p>
      </section>
      <figure className="flex flex-col gap-1">
        <Chart
          series={series}
          label={words.chart}
          marker={shown ? cursor : undefined}
          range={{ min: 0, max: 1 }}
          className="h-20 w-full"
        />
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span>{words.chartKey.practice}</span>
          <span>{words.chartKey.fresh}</span>
        </figcaption>
      </figure>
    </div>
  );
}
