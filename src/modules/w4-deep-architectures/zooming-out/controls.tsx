"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { KEEPS, MOST, type Keep, type ZoomFrame, type ZoomState } from "./model";

const KEEP_OPTIONS = KEEPS.map((value) => ({ value, label: words.keep.names[value] }));

export const describeShrink = (value: number) =>
  words.shrink.names[Math.round(value)] ?? words.shrink.names[0] ?? "";

export function ZoomControls({ state, update }: ModuleViewProps<ZoomState, ZoomFrame>) {
  return (
    <>
      <Dial
        label={words.shrink.label}
        value={state.shrink}
        min={0}
        max={MOST}
        step={1}
        onChange={(shrink) => update({ shrink })}
        describe={describeShrink}
      />
      <SegmentedControl
        label={words.keep.label}
        showLabel
        options={KEEP_OPTIONS}
        value={state.keep}
        onChange={(keep: Keep) => update({ keep })}
      />
    </>
  );
}
