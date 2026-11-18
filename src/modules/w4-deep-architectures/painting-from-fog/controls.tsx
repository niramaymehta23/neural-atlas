"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { BRUSHES, CLEANINGS, FOGS, keyOf, type FogFrame, type FogState } from "./model";

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";
const BRUSH_OPTIONS = BRUSHES.map((value) => ({ value, label: words.brush.names[value] }));

export const describeCleanings = (value: number) =>
  value === 1 ? words.cleanings.one : words.cleanings.many(count(value));

export function FogControls({ state, update, timeline }: ModuleViewProps<FogState, FogFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.cleanings.label}
        value={state.cleanings}
        min={CLEANINGS.min}
        max={CLEANINGS.most}
        step={1}
        onChange={(cleanings) => update({ cleanings })}
        describe={describeCleanings}
      />
      <Dial
        label={words.fog.label}
        value={state.fog}
        min={FOGS.min}
        max={FOGS.most}
        step={1}
        onChange={(fog) => update({ fog })}
        describe={(value) => words.fog.number(count(value))}
      />
      <SegmentedControl
        label={words.brush.label}
        showLabel
        vertical={false}
        options={BRUSH_OPTIONS}
        value={state.brush}
        onChange={(brush) => update({ brush })}
      />
      <button
        type="button"
        disabled={state.paint.length === 0}
        onClick={() => update({ paint: [] })}
        className={BUTTON}
      >
        {words.rubAll}
      </button>
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className={BUTTON}
      >
        {state.runs === 0 ? words.clear : working ? words.working : words.again}
      </button>
    </>
  );
}
