"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { STEPS, VALLEYS, type DownhillFrame, type DownhillState } from "./model";

const describeStep = (value: number) =>
  value > 0.66
    ? words.step.huge
    : value > 0.33
      ? words.step.big
      : value > 0.1
        ? words.step.small
        : words.step.tiny;

const describeRolling = (value: number) =>
  value > 0.66
    ? words.keepRolling.lots
    : value > 0.2
      ? words.keepRolling.some
      : words.keepRolling.none;

const VALLEY_OPTIONS = VALLEYS.map((value) => ({ value, label: words.valley[value] }));

export function DownhillControls({
  state,
  update,
  timeline,
}: ModuleViewProps<DownhillState, DownhillFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // A roll is over once its last step is recorded, whether or not it has played on screen (DH-01).
  const rolling = state.runs > 0 && timeline.at(length - 1)?.epoch !== STEPS;
  return (
    <>
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <Dial
        label={words.keepRolling.label}
        value={state.keepRolling}
        onChange={(keepRolling) => update({ keepRolling })}
        describe={describeRolling}
      />
      <SegmentedControl
        label={words.valley.label}
        options={VALLEY_OPTIONS}
        value={state.valley}
        onChange={(valley) => update({ valley })}
      />
      <button
        type="button"
        disabled={rolling}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.roll : rolling ? words.rolling : words.rollAgain}
      </button>
    </>
  );
}
