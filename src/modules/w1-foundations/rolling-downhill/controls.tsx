"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { VALLEYS, type DownhillFrame, type DownhillState } from "./model";

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

export function DownhillControls({ state, update }: ModuleViewProps<DownhillState, DownhillFrame>) {
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
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent"
      >
        {state.runs === 0 ? words.roll : words.rollAgain}
      </button>
    </>
  );
}
