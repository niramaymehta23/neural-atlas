"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import {
  CELLS,
  COLUMNS,
  isReady,
  keyOf,
  READY,
  READY_NAMES,
  type DrawFrame,
  type DrawState,
} from "./model";

const describePractice = (value: number) =>
  value > 0.66 ? words.practice.long : value > 0.25 ? words.practice.medium : words.practice.short;
const FLAT = Array.from({ length: COLUMNS }, () => 0);
const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-2 text-sm aria-pressed:border-ink aria-pressed:font-semibold md:min-h-0";

export function DrawControls({ state, update, timeline }: ModuleViewProps<DrawState, DrawFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.cells.label}
        value={state.cells}
        min={CELLS.min}
        max={CELLS.max}
        step={1}
        onChange={(cells) => update({ cells })}
        describe={(value) => (value === 1 ? words.cells.one : words.cells.many(count(value)))}
      />
      <Dial
        label={words.practice.label}
        value={state.practice}
        onChange={(practice) => update({ practice })}
        describe={describePractice}
      />
      <div role="group" aria-label={words.ready.label} className="flex flex-col gap-1">
        <p className="text-xs text-ink-soft" aria-hidden>
          {words.ready.label}
        </p>
        <div className="flex flex-wrap gap-2">
          {READY_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={isReady(state.heights, name)}
              onClick={() => update({ heights: [...READY[name]] })}
              className={BUTTON}
            >
              {words.ready.names[name]}
            </button>
          ))}
          <button type="button" onClick={() => update({ heights: [...FLAT] })} className={BUTTON}>
            {words.ready.flat}
          </button>
        </div>
      </div>
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.practise : working ? words.working : words.again}
      </button>
    </>
  );
}
