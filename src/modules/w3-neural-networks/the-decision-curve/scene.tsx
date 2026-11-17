"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count, sentenceStart } from "@/design/copy";
import { linePath } from "@/design/encodings";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { ActivationStrip } from "@/features/inside/ActivationStrip";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  cellAnswers,
  COPIED,
  curveOf,
  curveRun,
  dotsOf,
  isFinished,
  keyOf,
  type CurveFrame,
  type CurveState,
} from "./model";

type Props = ModuleViewProps<CurveState, CurveFrame>;

const WIDTH = 320;
const HEIGHT = 200;
const RANGE = { min: -1.6, max: 1.6 };
const NEAR = 0.1;
const toX = (x: number) => ((x + 1) / 2) * WIDTH;
const toY = (y: number) =>
  HEIGHT -
  ((Math.max(RANGE.min, Math.min(RANGE.max, y)) - RANGE.min) / (RANGE.max - RANGE.min)) * HEIGHT;

/** How close the finished line is to the dots, in words. */
export function howClose(state: CurveState, frame: CurveFrame | undefined) {
  if (!isFinished(state, frame)) return words.howClose.waiting;
  return frame.loss <= COPIED
    ? words.howClose.close
    : frame.loss <= NEAR
      ? words.howClose.near
      : words.howClose.far;
}

/** The dots, the line the cells draw, and what each cell says across the line. */
export function CurveScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: curveRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const dots = useMemo(() => dotsOf(state.shape), [state.shape]);
  const line = useMemo(() => (ours ? curveOf(state, ours.params) : null), [ours, state]);
  const strip = useMemo(() => (ours ? cellAnswers(state, ours.params) : []), [ours, state]);
  if (failure) throw failure;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="the-decision-curve"
      data-epoch={ours?.epoch ?? 0}
    >
      <figure className="flex flex-col gap-1">
        <svg
          role="img"
          aria-label={words.picture}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full rounded-card border border-hairline bg-paper"
        >
          <line x1={0} x2={WIDTH} y1={toY(0)} y2={toY(0)} stroke="var(--color-hairline)" />
          {line && (
            <path
              d={linePath(
                line.map((value) => Math.max(RANGE.min, Math.min(RANGE.max, value))),
                WIDTH,
                HEIGHT,
                RANGE,
              )}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={3}
              strokeLinejoin="round"
              data-curve
            />
          )}
          {dots.map(({ x, y }) => (
            <circle
              key={x}
              cx={toX(x)}
              cy={toY(y)}
              r={4}
              fill="var(--color-flow)"
              stroke="var(--color-ink)"
              strokeWidth={1}
            />
          ))}
        </svg>
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <circle cx={5} cy={5} r={4} fill="var(--color-flow)" stroke="var(--color-ink)" />
            </svg>
            {words.key.dots}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
              <line x1={0} x2={16} y1={5} y2={5} stroke="var(--color-ink)" strokeWidth={3} />
            </svg>
            {words.key.line}
          </span>
        </figcaption>
      </figure>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-12 flex-col gap-1 text-sm">
        <p data-how-close>{howClose(state, ours)}</p>
        {ours && ours.silent > 0 && (
          <p className="text-ink-soft" data-silent={ours.silent}>
            {sentenceStart(words.silent(count(ours.silent), ours.silent === 1))}
          </p>
        )}
      </div>
      <div className="min-h-24">
        {state.bend !== "identity" && strip.length > 0 && (
          <ActivationStrip layers={strip} range={{ min: -1.5, max: 1.5 }} words={words.strip} />
        )}
      </div>
    </div>
  );
}
