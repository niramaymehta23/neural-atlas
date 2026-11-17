"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { CELLS, keyOf, type StartFrame, type StartState } from "./model";

const describeWild = (value: number) =>
  value > 0.75
    ? words.wild.huge
    : value > 0.4
      ? words.wild.wild
      : value > 0.1
        ? words.wild.gentle
        : words.wild.tiny;

export function StartControls({
  state,
  update,
  timeline,
}: ModuleViewProps<StartState, StartFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Waiting for the spin these settings ask for.
  const spinning = state.spins > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.wild.label}
        value={state.wild}
        onChange={(wild) => update({ wild })}
        describe={describeWild}
      />
      <Dial
        label={words.cellsDial.label}
        value={state.cells}
        min={CELLS.min}
        max={CELLS.max}
        step={1}
        onChange={(cells) => update({ cells })}
        describe={(value) => words.cellsDial.count(count(value))}
      />
      <Toggle label={words.same} checked={state.same} onChange={(same) => update({ same })} />
      <button
        type="button"
        disabled={spinning}
        onClick={() => update(({ spins }) => ({ spins: spins + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.spins === 0 ? words.spin : spinning ? words.spinning : words.again}
      </button>
    </>
  );
}
