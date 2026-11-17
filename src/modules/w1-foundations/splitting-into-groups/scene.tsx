"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { count, sentenceStart } from "@/design/copy";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs, type Point } from "@/data/datasets";
import { PaintCanvas, type PaintWords } from "@/data/PaintCanvas";
import { chance, predict } from "@/engine/autodiff/dense";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { DataLens, lensCount } from "@/features/inside/DataLens";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  canSplit,
  chancesFor,
  ERASER,
  fenceEnds,
  fenceRun,
  GARDENS,
  keyOf,
  MAX_POINTS,
  plant,
  roundPoint,
  SPEC,
  type SplitFrame,
  type SplitState,
} from "./model";

type Props = ModuleViewProps<SplitState, SplitFrame>;

const FIELD = 48;
const GRID = gridInputs(FIELD);
const VIEW = 200;
const LENS_RADIUS = 0.3;
const toView = (value: number) => ((value + 1) / 2) * VIEW;

const PAINT_WORDS: PaintWords = {
  instructions: words.paint.instructions,
  position: (across, up) => words.paint.position(String(across), String(up)),
  planted: (group, across, up) =>
    words.paint.planted(words.paint.flowers[group] ?? "", String(across), String(up)),
  removed: (pulled, across, up) =>
    words.paint.removed(
      pulled === 0 ? words.paint.nothing : words.paint.pulled(count(pulled), pulled === 1),
      String(across),
      String(up),
    ),
};

const flowers = (total: number) => words.lens.flowers(count(total), total === 1);

/** What the glass shows, in one sentence (also used by `describe`). */
export function lensSentence(state: SplitState, frame: SplitFrame | undefined): string {
  if (!frame) return words.lens.waiting;
  const { inside, sure } = lensCount(
    state.points,
    chancesFor(state.points, frame.params),
    state.lens,
    LENS_RADIUS,
  );
  return inside === 0 ? words.lens.empty : words.lens.readout(flowers(inside), count(sure));
}

/** The field with its flowers, the fence learning where to stand, and the magnifying glass. */
export function SplitScene(props: Props) {
  const { state, update, timeline, side } = props;
  const main = side === "main";
  const ready = canSplit(state.points);
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: fenceRun,
    settings: keyOf(state),
    rerun: () => {
      if (canSplit(state.points)) update(({ runs }) => ({ runs: runs + 1 }), { touch: false });
    },
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = ready && state.runs > 0 ? timeline.at(cursor) : undefined;
  const [full, setFull] = useState(false);
  const planting = useRef<Point[]>([]);
  const flush = useRef(0);

  const field = useMemo(
    () => (shown ? Float32Array.from(predict(SPEC, shown.params, GRID), chance) : null),
    [shown],
  );
  const chances = useMemo(
    () => (shown ? chancesFor(state.points, shown.params) : null),
    [shown, state.points],
  );
  const ends = shown ? fenceEnds(shown.params) : null;
  if (failure) throw failure;

  // Plants from one frame go in together: one change of state (MLP-04).
  const onAdd = (point: Point) => {
    planting.current.push(roundPoint(point));
    if (flush.current) return;
    flush.current = requestAnimationFrame(() => {
      flush.current = 0;
      const batch = planting.current;
      planting.current = [];
      update(({ points }) => {
        const room = Math.max(0, MAX_POINTS - points.length);
        setFull(batch.length > room);
        return { points: room > 0 ? [...points, ...batch.slice(0, room)] : points };
      });
    });
  };
  const onRemove = (indices: number[]) => {
    const gone = new Set(indices);
    setFull(false);
    update(({ points }) => ({ points: points.filter((_, index) => !gone.has(index)) }));
  };

  return (
    <div className="flex grow flex-col gap-3" data-testid="splitting-into-groups">
      {main && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{words.start}</span>
          {GARDENS.map((garden) => (
            <button
              key={garden}
              type="button"
              aria-pressed={state.garden === garden}
              onClick={() => update({ garden, points: plant(garden) })}
              className="min-h-11 rounded-pill border border-hairline px-3 py-1 aria-pressed:border-2 aria-pressed:border-ink aria-pressed:bg-paper md:min-h-0"
            >
              {words.gardens[garden]}
            </button>
          ))}
        </div>
      )}
      <div className="relative mx-auto w-full max-w-md">
        <PaintCanvas
          label={words.garden}
          words={PAINT_WORDS}
          points={state.points}
          group={state.brush === ERASER ? 0 : state.brush}
          erasing={state.brush === ERASER}
          onAdd={onAdd}
          onRemove={onRemove}
        >
          <DecisionField outputs={field} groups={2} resolution={FIELD} />
          {ends && (
            <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 size-full" aria-hidden>
              <line
                x1={toView(ends[0].x)}
                y1={toView(-ends[0].y)}
                x2={toView(ends[1].x)}
                y2={toView(-ends[1].y)}
                stroke="var(--color-ink)"
                strokeWidth={3}
                strokeLinecap="round"
                data-fence
              />
            </svg>
          )}
        </PaintCanvas>
        {main && (
          <DataLens
            points={state.points}
            chances={chances}
            lens={state.lens}
            onMove={(lens) => update({ lens })}
            words={words.lens}
            radius={LENS_RADIUS}
          />
        )}
      </div>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-16 flex-col gap-1 text-sm">
        <p data-right-side>
          {shown
            ? sentenceStart(words.rightSide(count(shown.right), count(state.points.length)))
            : words.noFenceYet}
        </p>
        {main && <p className="text-ink-soft">{lensSentence(state, shown)}</p>}
        {main && (full || !ready) && (
          <p className="text-ink-soft" data-notice={full ? "full" : "need-both"}>
            {full ? words.full : words.needBoth}
          </p>
        )}
      </div>
    </div>
  );
}
