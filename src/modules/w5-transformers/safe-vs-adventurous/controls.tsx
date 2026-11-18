"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { ALL, MOST_HEAT, type SamplingFrame, type SamplingState } from "./model";

export function SamplingControls({ state, update }: ModuleViewProps<SamplingState, SamplingFrame>) {
  return (
    <>
      <Dial
        label={words.heat.label}
        value={state.heat}
        min={0}
        max={MOST_HEAT}
        step={0.1}
        onChange={(heat) => update({ heat })}
        describe={words.heat.describe}
      />
      <Dial
        label={words.choices.label}
        value={state.choices}
        min={1}
        max={ALL}
        step={1}
        onChange={(choices) => update({ choices })}
        describe={(value) => words.choices.describe(value, value >= ALL)}
      />
    </>
  );
}
