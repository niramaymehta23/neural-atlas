"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { keyOf, LIMITS, type SurpriseFrame, type SurpriseState } from "./model";

type Props = ModuleViewProps<SurpriseState, SurpriseFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

const describeHide = (value: number) =>
  value > 0.66 ? words.hide.lots : value > 0.25 ? words.hide.some : words.hide.few;

export function SurpriseControls({ state, update, timeline }: Props) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.hide.label}
        value={state.hide}
        onChange={(hide) => update({ hide })}
        describe={describeHide}
      />
      <Dial
        label={words.cells.label}
        value={state.cells}
        min={LIMITS.cells.min}
        max={LIMITS.cells.max}
        step={1}
        onChange={(cells) => update({ cells })}
        describe={(value) => (value === 1 ? words.cells.one : words.cells.describe(count(value)))}
      />
      <Toggle label={words.peek} checked={state.peek} onChange={(peek) => update({ peek })} />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={working}
          onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.runs === 0 ? words.practise : working ? words.working : words.again}
        </button>
        <button
          type="button"
          disabled={state.runs === 0 || state.fresh}
          onClick={() => update({ fresh: true })}
          className={BUTTON}
        >
          {words.tryFresh}
        </button>
      </div>
    </>
  );
}
