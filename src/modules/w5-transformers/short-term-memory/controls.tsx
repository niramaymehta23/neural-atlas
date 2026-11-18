"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { MOST_CHATTER, PETS, WINDOW, type MemoryFrame, type MemoryState } from "./model";

const PET_OPTIONS = PETS.map((value) => ({ value, label: words.pets[value] ?? value }));

export function MemoryControls({ state, update }: ModuleViewProps<MemoryState, MemoryFrame>) {
  return (
    <>
      <SegmentedControl
        label={words.pet}
        showLabel
        options={PET_OPTIONS}
        value={state.pet as (typeof PETS)[number]}
        onChange={(pet) => update({ pet })}
      />
      <Dial
        label={words.window.label}
        value={state.window}
        min={WINDOW.min}
        max={WINDOW.max}
        step={1}
        onChange={(window) => update({ window })}
        describe={words.window.describe}
      />
      <Dial
        label={words.chatter.label}
        value={state.chatter}
        min={0}
        max={MOST_CHATTER}
        step={1}
        onChange={(chatter) => update({ chatter })}
        describe={words.chatter.describe}
      />
    </>
  );
}
