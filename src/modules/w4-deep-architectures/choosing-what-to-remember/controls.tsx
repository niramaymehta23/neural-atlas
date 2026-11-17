"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { LENGTH } from "@/features/memory/run";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { GATE_MODES, keyOf, STARTS, type GatesFrame, type GatesState } from "./model";

const describeStep = (value: number) =>
  value > 0.75
    ? words.step.huge
    : value > 0.45
      ? words.step.big
      : value > 0.2
        ? words.step.small
        : words.step.tiny;

const START_OPTIONS = STARTS.map((value) => ({ value, label: words.start[value] }));
const MODE_OPTIONS = GATE_MODES.map((value) => ({ value, label: words.gates.modes[value] }));
const GATES = ["keep", "letIn", "readOut"] as const;

export function GatesControls({
  state,
  update,
  timeline,
}: ModuleViewProps<GatesState, GatesFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.length.label}
        value={state.length}
        min={LENGTH.min}
        max={LENGTH.max}
        step={1}
        onChange={(value) => update({ length: value })}
        describe={(value) => words.length.words(count(value))}
      />
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <SegmentedControl
        label={words.start.label}
        showLabel
        options={START_OPTIONS}
        value={state.start}
        onChange={(start) => update({ start })}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.practise : working ? words.working : words.again}
      </button>
      {state.cell === "gated" ? (
        GATES.map((gate) => (
          <div key={gate} className="flex flex-col gap-1">
            <SegmentedControl
              label={words.gates[gate].label}
              showLabel
              options={MODE_OPTIONS}
              value={state[gate]}
              onChange={(mode) => update({ [gate]: mode })}
            />
            <p className="max-w-56 text-xs text-ink-soft">{words.gates[gate].note}</p>
          </div>
        ))
      ) : (
        <p className="max-w-56 text-xs text-ink-soft">{words.gates.plain}</p>
      )}
    </>
  );
}
