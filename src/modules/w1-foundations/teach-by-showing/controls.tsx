"use client";

import { useId, useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { allSorted, isCurrent, type TeachFrame, type TeachState } from "./model";

type Props = ModuleViewProps<TeachState, TeachFrame>;

const describeShow = (value: number) =>
  value > 0.66 ? words.show.lots : value > 0.25 ? words.show.some : words.show.few;
const describeMessy = (value: number) =>
  value > 0.6 ? words.messy.very : value > 0.25 ? words.messy.some : words.messy.neat;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function TeachControls({ state, update, timeline }: Props) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const ready = allSorted(state);
  const tried = isCurrent(state, timeline.at(length - 1));
  const hintId = useId();
  // Changing how many fruit or how messy they are means sorting a new batch.
  return (
    <>
      <Dial
        label={words.show.label}
        value={state.show}
        onChange={(show) => update({ show, baskets: [] })}
        describe={describeShow}
      />
      <Dial
        label={words.messy.label}
        value={state.messy}
        onChange={(messy) => update({ messy, baskets: [] })}
        describe={describeMessy}
      />
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!ready}
            aria-describedby={ready ? undefined : hintId}
            onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
            className={`${BUTTON} text-accent-ink`}
          >
            {tried ? words.tryAgain : words.letItTry}
          </button>
          <button
            type="button"
            disabled={state.baskets.length === 0}
            onClick={() => update({ baskets: [] })}
            className={BUTTON}
          >
            {words.startOver}
          </button>
        </div>
        {!ready && (
          <p id={hintId} className="text-sm text-ink-soft">
            {words.needSorting}
          </p>
        )}
      </div>
    </>
  );
}
