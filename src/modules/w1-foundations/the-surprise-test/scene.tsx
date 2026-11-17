"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count, outOf } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs } from "@/data/datasets";
import { chance, predict } from "@/engine/autodiff/dense";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  DOTS,
  hiddenSet,
  keyOf,
  share,
  specFor,
  surpriseRun,
  type SurpriseFrame,
  type SurpriseState,
} from "./model";

type Props = ModuleViewProps<SurpriseState, SurpriseFrame>;

const FIELD = 48;
const GRID = gridInputs(FIELD);
const VIEW = 200;
const toView = (value: number) => ((value + 1) / 2) * VIEW;

/** A small key swatch: filled for practice, hollow and dashed for hidden. */
function KeyMark({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <path
        d={markPath("circle", 8, 8, 5)}
        fill={hidden ? "none" : classTone(0)}
        stroke="var(--color-ink)"
        strokeWidth={1.3}
        strokeDasharray={hidden ? "2 1.5" : undefined}
      />
    </svg>
  );
}

/** The dots, the hidden ones marked, the learner's fence, and its three scores. */
export function SurpriseScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: surpriseRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const hidden = useMemo(() => hiddenSet(state.hide), [state.hide]);
  const field = useMemo(
    () =>
      shown ? Float32Array.from(predict(specFor(state.cells), shown.params, GRID), chance) : null,
    [shown, state.cells],
  );
  if (failure) throw failure;

  return (
    <div className="flex grow flex-col gap-3" data-testid="the-surprise-test">
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-card border border-hairline bg-paper">
        <div className="absolute inset-0">
          <DecisionField outputs={field} groups={2} resolution={FIELD} />
        </div>
        <svg
          role="img"
          aria-label={words.scene}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="absolute inset-0 size-full"
        >
          {DOTS.map(({ x, y, label }, index) => {
            const secret = hidden.has(index);
            return (
              <path
                key={index}
                d={markPath(classMark(label), toView(x), toView(-y), secret ? 4 : 3.4)}
                fill={secret ? "var(--color-paper)" : classTone(label)}
                fillOpacity={secret ? 0.7 : 1}
                stroke="var(--color-ink)"
                strokeWidth={secret ? 1.2 : 0.8}
                strokeDasharray={secret ? "2 1.5" : undefined}
                data-hidden={secret || undefined}
              />
            );
          })}
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li className="flex items-center gap-2">
          <KeyMark hidden={false} />
          {words.key.seen}
        </li>
        <li className="flex items-center gap-2">
          <KeyMark hidden />
          {words.key.hidden}
        </li>
      </ul>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-24 flex-col gap-1 text-sm" data-scores>
        {shown ? (
          <>
            <p data-score="practice">
              {words.scores.practice(count(shown.practice.right), count(shown.practice.total))}
            </p>
            <p data-score="surprise">
              {words.scores.surprise(count(shown.surprise.right), count(shown.surprise.total))}
            </p>
            <p data-score="fresh">
              {state.fresh
                ? words.scores.fresh(outOf(share(shown.fresh)))
                : words.scores.freshHidden}
            </p>
            {state.peek && <p className="text-ink-soft">{words.peeking}</p>}
          </>
        ) : (
          <p className="text-ink-soft">{words.notYet}</p>
        )}
      </div>
    </div>
  );
}
