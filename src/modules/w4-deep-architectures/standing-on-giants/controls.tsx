"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { MOST_TEACH, STARTS, type GiantFrame, type GiantState, type Start } from "./model";

const START_OPTIONS = STARTS.map((value) => ({ value, label: words.start.names[value] }));

export const describeTeach = (value: number) =>
  words.teach.names[Math.round(value) - 1] ?? words.teach.names[0] ?? "";

export function GiantControls({ state, update }: ModuleViewProps<GiantState, GiantFrame>) {
  return (
    <>
      <SegmentedControl
        label={words.start.label}
        showLabel
        options={START_OPTIONS}
        value={state.start}
        onChange={(start: Start) => update({ start })}
      />
      <Dial
        label={words.teach.label}
        value={state.teach}
        min={1}
        max={MOST_TEACH}
        step={1}
        onChange={(teach) => update({ teach })}
        describe={describeTeach}
      />
    </>
  );
}
