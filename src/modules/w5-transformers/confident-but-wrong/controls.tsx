"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { KINDS, type Kind, type TruthFrame, type TruthState } from "./model";

const OPTIONS = KINDS.map((value) => ({ value, label: words.kinds[value] }));

export function TruthControls({ state, update }: ModuleViewProps<TruthState, TruthFrame>) {
  return (
    <SegmentedControl
      label={words.kinds.label}
      showLabel
      vertical
      options={OPTIONS}
      value={state.kind as Kind}
      onChange={(kind) => update({ kind, source: false })}
    />
  );
}
