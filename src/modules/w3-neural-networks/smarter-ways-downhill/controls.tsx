"use client";

import { useSyncExternalStore } from "react";
import { VALLEYS } from "@/features/building/race/race";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { keyOf, type SmarterFrame, type SmarterState } from "./model";

const describeStep = (value: number) =>
  value > 0.66
    ? words.step.huge
    : value > 0.33
      ? words.step.big
      : value > 0.1
        ? words.step.small
        : words.step.tiny;

const describeExamples = (value: number) =>
  value > 0.9 ? words.examples.all : value > 0.4 ? words.examples.some : words.examples.few;

const VALLEY_OPTIONS = VALLEYS.map((value) => ({ value, label: words.valley[value] }));

export function SmarterControls({
  state,
  update,
  timeline,
}: ModuleViewProps<SmarterState, SmarterFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Waiting for the race these dials ask for (it comes once the dials rest).
  const racing = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <Dial
        label={words.examples.label}
        value={state.examples}
        onChange={(examples) => update({ examples })}
        describe={describeExamples}
      />
      <SegmentedControl
        label={words.valley.label}
        options={VALLEY_OPTIONS}
        value={state.valley}
        onChange={(valley) => update({ valley })}
      />
      <button
        type="button"
        disabled={racing}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.race : racing ? words.racing : words.again}
      </button>
    </>
  );
}
