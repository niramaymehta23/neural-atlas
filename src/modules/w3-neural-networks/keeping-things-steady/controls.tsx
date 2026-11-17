"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { keyOf, LAYERS, type SteadyFrame, type SteadyState } from "./model";

const describeWild = (value: number) =>
  value > 0.75
    ? words.wild.wild
    : value > 0.4
      ? words.wild.lively
      : value > 0.1
        ? words.wild.gentle
        : words.wild.quiet;

export function SteadyControls({
  state,
  update,
  timeline,
}: ModuleViewProps<SteadyState, SteadyFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Waiting for the run these settings ask for.
  const practising = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.layersDial.label}
        value={state.layers}
        min={LAYERS.min}
        max={LAYERS.max}
        step={1}
        onChange={(layers) => update({ layers })}
        describe={(value) => words.layersDial.count(count(value))}
      />
      <Dial
        label={words.wild.label}
        value={state.wild}
        onChange={(wild) => update({ wild })}
        describe={describeWild}
      />
      <Toggle label={words.calm} checked={state.calm} onChange={(calm) => update({ calm })} />
      <button
        type="button"
        disabled={practising}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.practise : practising ? words.practising : words.again}
      </button>
    </>
  );
}
