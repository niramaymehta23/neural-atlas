"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { BENDS, CELLS, keyOf, SHAPES, type CurveFrame, type CurveState } from "./model";

const describeStep = (value: number) =>
  value > 0.85
    ? words.step.huge
    : value > 0.55
      ? words.step.big
      : value > 0.25
        ? words.step.small
        : words.step.tiny;

const BEND_OPTIONS = BENDS.map((value) => ({ value, label: words.bend.names[value] }));
const SHAPE_OPTIONS = SHAPES.map((value) => ({ value, label: words.shape.names[value] }));

export function CurveControls({
  state,
  update,
  timeline,
}: ModuleViewProps<CurveState, CurveFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
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
      <SegmentedControl
        label={words.shape.label}
        showLabel
        options={SHAPE_OPTIONS}
        value={state.shape}
        onChange={(shape) => update({ shape })}
      />
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <Dial
        label={words.cells.label}
        value={state.cells}
        min={CELLS.min}
        max={CELLS.max}
        step={1}
        onChange={(cells) => update({ cells })}
        describe={(value) => (value === 1 ? words.cells.one : words.cells.many(count(value)))}
      />
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
