"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { HEAT, KINDS, type Kind, type TruthFrame, type TruthState } from "./model";

const OPTIONS = KINDS.map((value) => ({ value, label: words.kinds[value] }));

export function TruthControls({ state, update }: ModuleViewProps<TruthState, TruthFrame>) {
  return (
    <>
      <SegmentedControl
        label={words.kinds.label}
        showLabel
        vertical
        options={OPTIONS}
        value={state.kind as Kind}
        onChange={(kind) => update({ kind, source: false })}
      />
      <Dial
        label={words.need.label}
        value={state.need}
        min={0}
        max={1}
        step={0.05}
        onChange={(need) => update({ need, source: false })}
        describe={words.need.describe}
      />
      <Dial
        label={words.heat.label}
        value={state.heat}
        min={HEAT.min}
        max={HEAT.max}
        step={0.1}
        onChange={(heat) => update({ heat, source: false })}
        describe={words.heat.describe}
      />
    </>
  );
}
