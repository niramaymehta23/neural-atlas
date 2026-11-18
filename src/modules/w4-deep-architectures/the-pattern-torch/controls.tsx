"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { PRESETS, presetOf, TORCHES, type Preset, type TorchFrame, type TorchState } from "./model";

const PRESET_OPTIONS = [...PRESETS, "own" as const].map((value) => ({
  value,
  label: words.presets.names[value],
}));

const describeSweep = (value: number) =>
  value <= 0
    ? words.sweep.none
    : value >= 1
      ? words.sweep.all
      : value >= 0.5
        ? words.sweep.most
        : words.sweep.some;

const describeStrict = (value: number) =>
  value >= 0.95
    ? words.strict.perfect
    : value > 0.55
      ? words.strict.strong
      : value > 0.15
        ? words.strict.fair
        : words.strict.any;

export function TorchControls({ state, update }: ModuleViewProps<TorchState, TorchFrame>) {
  const preset = presetOf(state.torch) ?? "own";
  return (
    <>
      <SegmentedControl
        label={words.presets.label}
        showLabel
        options={PRESET_OPTIONS}
        value={preset}
        onChange={(next: Preset | "own") => {
          if (next !== "own") update({ torch: [...TORCHES[next]] });
        }}
      />
      <Dial
        label={words.sweep.label}
        value={state.sweep}
        step={0.05}
        onChange={(sweep) => update({ sweep })}
        describe={describeSweep}
      />
      <button
        type="button"
        onClick={() => {
          if (state.sweep < 1) return update({ sweep: 1 });
          // Sweep again from the top: back to the start, then all the way across.
          update({ sweep: 0 });
          setTimeout(() => update({ sweep: 1 }), 0);
        }}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0"
      >
        {words.sweep.button}
      </button>
      <Dial
        label={words.strict.label}
        value={state.strict}
        step={0.05}
        onChange={(strict) => update({ strict })}
        describe={describeStrict}
      />
    </>
  );
}
