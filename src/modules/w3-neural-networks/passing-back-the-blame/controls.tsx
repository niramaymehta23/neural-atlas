"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { BENDS, keyOf, LAYERS, type BlameFrame, type BlameState } from "./model";

const describeStep = (value: number) =>
  value > 0.66 ? words.step.big : value > 0.25 ? words.step.medium : words.step.small;
const BEND_OPTIONS = BENDS.map((value) => ({ value, label: words.bend.names[value] }));

export function BlameControls({
  state,
  update,
  timeline,
}: ModuleViewProps<BlameState, BlameFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.layers.label}
        value={state.layers}
        min={LAYERS.min}
        max={LAYERS.max}
        step={1}
        onChange={(layers) => update({ layers })}
        describe={(value) => (value === 1 ? words.layers.one : words.layers.many(count(value)))}
      />
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <div className="flex flex-col gap-1">
        <SegmentedControl
          label={words.bend.label}
          showLabel
          options={BEND_OPTIONS}
          value={state.bend}
          onChange={(bend) => update({ bend })}
        />
        <p className="max-w-56 text-xs text-ink-soft">{words.bend.notes[state.bend]}</p>
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
