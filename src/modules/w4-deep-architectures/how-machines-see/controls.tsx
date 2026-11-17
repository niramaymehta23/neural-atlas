"use client";

import type { Stage } from "@/engine/vision/seeing";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { DEPTHS, FAINT, STRONGEST, WEAKEST, type SeeFrame, type SeeState } from "./model";

const DEPTH_OPTIONS = DEPTHS.map((value) => ({ value, label: words.depth.names[value] }));

const describeStrength = (value: number) =>
  value <= FAINT ? words.smudge.tooFaint : value <= 5 ? words.smudge.faint : words.smudge.visible;

export function SeeControls({ state, update }: ModuleViewProps<SeeState, SeeFrame>) {
  return (
    <>
      <SegmentedControl
        label={words.depth.label}
        showLabel
        options={DEPTH_OPTIONS}
        value={state.depth}
        onChange={(depth: Stage) => update({ depth })}
      />
      <Toggle
        label={words.smudge.toggle}
        checked={state.smudge}
        onChange={(smudge) => update({ smudge })}
      />
      <Dial
        label={words.smudge.strength}
        value={state.strength}
        min={WEAKEST}
        max={STRONGEST}
        step={1}
        onChange={(strength) => update({ strength })}
        describe={describeStrength}
      />
    </>
  );
}
