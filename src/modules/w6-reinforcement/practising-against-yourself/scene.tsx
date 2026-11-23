"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Cap } from "./Cap";
import { HabitStrip } from "./HabitStrip";
import { PracticeChart } from "./PracticeChart";
import { SticksRow } from "./SticksRow";
import { words } from "./captions";
import { keyOf, practiceRun, startOf, type PracticeFrame, type PracticeState } from "./model";

type Props = ModuleViewProps<PracticeState, PracticeFrame>;

/** The table with their newest game, what each has learned, and how Pip is doing. */
export function PracticeScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: practiceRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Before practice (or while it is worked out) the habits they start with.
  const start = useMemo(() => startOf(state), [state]);
  if (failure) throw failure;
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const upTo = ours ? timeline.frames().slice(0, cursor + 1) : [];
  const partner = upTo.flatMap(({ pipShare }) => (pipShare === null ? [] : [pipShare]));
  const newcomer = upTo.map(({ testShare }) => testShare);
  const lastTaker = ours?.last?.winner === 0 ? words.names.pip : words.names.pop;

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="practising-against-yourself"
      data-epoch={ours?.epoch ?? 0}
      data-partner={ours?.pipShare?.toFixed(2)}
      data-newcomer={ours?.testShare.toFixed(1)}
    >
      <section className="flex flex-col gap-1">
        <h3 className="font-serif text-base">{words.table.title}</h3>
        <SticksRow game={ours?.last ?? null} />
        <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 8 8" className="size-2.5" aria-hidden>
              <Cap player={0} x={4} y={4} size={3} />
            </svg>
            {words.key.pip}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 8 8" className="size-2.5" aria-hidden>
              <Cap player={1} x={4} y={4} size={3} />
            </svg>
            {words.key.pop}
          </span>
          {ours?.last && <span className="text-ink">{words.table.lastStick(lastTaker)}</span>}
        </div>
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="font-serif text-base">{words.habits.title}</h3>
        <p className="min-h-5 text-sm" data-note>
          {ours
            ? words.habits.knows(words.names.pip, ours.pipKnows)
            : state.runs === 0
              ? words.result.waiting
              : words.result.working}
        </p>
        <HabitStrip
          takes={(ours ?? start).pip}
          label={words.habits.picture(words.names.pip, (ours ?? start).pipKnows)}
        />
        <p className="min-h-5 text-sm">
          {state.frozen
            ? words.habits.frozen
            : ours
              ? words.habits.knows(words.names.pop, ours.popKnows)
              : words.habits.before}
        </p>
        <HabitStrip
          takes={(ours ?? start).pop}
          label={words.habits.picture(words.names.pop, (ours ?? start).popKnows)}
        />
        <p className="text-xs text-ink-soft">{words.habits.star}</p>
        <p className="text-xs text-ink-soft">{words.habits.none}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="font-serif text-base">{words.chart.title}</h3>
        <PracticeChart partner={partner} newcomer={newcomer} />
        <div className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span>{words.chart.partner}</span>
          <span>{words.chart.newcomer}</span>
          <span>{words.chart.even}</span>
        </div>
        {/* Reserved lines, so the page does not jump when the words change. */}
        <div className="flex min-h-12 flex-col gap-1 text-sm" data-result>
          {ours && ours.pipShare !== null && <p>{words.result.partner(ours.pipShare)}</p>}
          {ours && <p>{words.result.newcomer(ours.testShare)}</p>}
        </div>
      </section>
    </div>
  );
}
