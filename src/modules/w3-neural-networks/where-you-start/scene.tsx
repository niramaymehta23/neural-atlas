"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count, outOf } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs } from "@/data/datasets";
import { chance, hiddenOutputs, predict } from "@/engine/autodiff/dense";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  allCopies,
  DOTS,
  isFinished,
  keyOf,
  specFor,
  stripFor,
  spinRun,
  type StartFrame,
  type StartState,
} from "./model";

type Props = ModuleViewProps<StartState, StartFrame>;

const FIELD = 32;
const GRID = gridInputs(FIELD);
const VIEW = 200;
/** Mistakes above this are drawn at the top of the chart. */
const CHART_TOP = 0.8;
const toView = (value: number) => ((value + 1) / 2) * VIEW;

/** How the newest spin went, in one sentence (also used by `describe`). */
export function scoreSentence(state: StartState, frame: StartFrame | undefined): string {
  if (state.spins === 0) return words.score.waiting;
  if (!isFinished(state, frame)) return words.score.practising;
  return words.score.done(outOf(frame.right / DOTS.length, { total: DOTS.length }));
}

/** Whether the cells are copies, in one sentence. */
export const cellsSentence = (cells: number, params: readonly number[]) =>
  allCopies(cells, params) ? words.cells.copies : words.cells.different;

function Dots() {
  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full" aria-hidden>
      {DOTS.map(({ x, y, label }, index) => (
        <path
          key={index}
          data-group={label}
          d={markPath(classMark(label), toView(x), toView(-y), 3.4)}
          fill={classTone(label)}
          stroke="var(--color-ink)"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** The dots and the team's guess, each cell's own guess, the mistakes and the last few spins. */
export function StartScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.spins,
    work: spinRun,
    settings: keyOf(state),
    rerun: () => update(({ spins }) => ({ spins: spins + 1 }), { touch: false }),
  });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.spins > 0 ? timeline.at(cursor) : undefined;
  const newest = timeline.at(length - 1);
  // The frame's own team size: the dial may have moved before the new spin arrives.
  const cells = shown ? (shown.params.length - 1) / 4 : state.cells;
  const field = useMemo(
    () => (shown ? Float32Array.from(predict(specFor(cells), shown.params, GRID), chance) : null),
    [shown, cells],
  );
  const own = useMemo(() => {
    if (!shown) return null;
    const [layer] = hiddenOutputs(specFor(cells), shown.params, GRID);
    const rows = FIELD * FIELD;
    return Array.from({ length: cells }, (_, cell) =>
      Float32Array.from(
        layer?.subarray(cell * rows, (cell + 1) * rows) ?? [],
        (value) => (value + 1) / 2,
      ),
    );
  }, [shown, cells]);
  const series = useMemo(() => {
    const clip = (value: number) => Math.min(CHART_TOP, value);
    const now = {
      values: timeline
        .frames()
        .slice(0, length)
        .map(({ loss }) => clip(loss)),
    };
    const before = timeline.ghostFrames();
    return before.length > 0
      ? [now, { values: before.map(({ loss }) => clip(loss)), ghost: true }]
      : [now];
  }, [timeline, length]);
  // The strip follows the newest recorded spin, so turning a dial does not redo old spins.
  const strip = useMemo(() => stripFor(timeline.at(length - 1)?.key), [timeline, length]);
  if (failure) throw failure;

  return (
    <div className="flex grow flex-col gap-3" data-testid="where-you-start">
      <div
        role="img"
        aria-label={words.field}
        className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-card border border-hairline bg-paper"
      >
        <div className="absolute inset-0">
          <DecisionField outputs={field} groups={2} resolution={FIELD} />
        </div>
        <Dots />
      </div>
      <p className="min-h-6 text-sm" data-score>
        {scoreSentence(state, newest)}
      </p>
      <section className="flex flex-col gap-1" aria-label={words.cells.title}>
        <h3 className="text-sm text-ink-soft">{words.cells.title}</h3>
        <ul className="grid grid-cols-6 gap-2">
          {Array.from({ length: cells }, (_, cell) => (
            <li key={cell} className="flex flex-col items-center gap-1 text-xs">
              <div
                role="img"
                aria-label={words.cells.label(count(cell + 1))}
                className="relative aspect-square w-full overflow-hidden rounded-control border border-hairline bg-paper"
                data-cell={cell}
              >
                <DecisionField outputs={own?.[cell] ?? null} groups={2} resolution={FIELD} />
              </div>
              {words.cells.cell(count(cell + 1))}
            </li>
          ))}
        </ul>
        {/* A reserved line, so the page does not jump when the words change. */}
        <p className="min-h-10 text-sm" data-copies>
          {shown ? cellsSentence(cells, shown.params) : ""}
        </p>
      </section>
      <figure className="flex flex-col gap-1">
        <Chart
          series={series}
          label={words.chart}
          marker={shown ? cursor : undefined}
          range={{ min: 0, max: CHART_TOP }}
          className="h-20 w-full"
        />
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span>{words.chartKey.now}</span>
          {series.length > 1 && <span>{words.chartKey.ghost}</span>}
        </figcaption>
      </figure>
      <section className="flex flex-col gap-1" aria-label={words.strip.label}>
        <h3 className="text-sm text-ink-soft">{words.strip.title}</h3>
        <ol className="grid min-h-24 grid-cols-5 items-end gap-2" data-strip>
          {strip.map(({ spins, right }, index) => (
            <li key={spins} className="flex flex-col items-center gap-1 text-xs">
              <div className="flex h-12 w-full items-end rounded-control bg-inset" aria-hidden>
                <div
                  className="w-full rounded-control border border-ink bg-flow"
                  style={{ height: `${Math.max(4, (right / DOTS.length) * 100)}%` }}
                />
              </div>
              <span>{words.strip.spin(count(spins))}</span>
              <span className="text-ink-soft">
                {outOf(right / DOTS.length, { total: DOTS.length })}
                {index === strip.length - 1 ? ` (${words.strip.newest})` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
