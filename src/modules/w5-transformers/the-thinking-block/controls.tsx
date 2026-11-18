"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { MOST_BLOCKS, type BlockFrame, type BlockState } from "./model";

export function BlockControls({ state, update }: ModuleViewProps<BlockState, BlockFrame>) {
  return (
    <>
      <Dial
        label={words.blocks.label}
        value={state.blocks}
        min={1}
        max={MOST_BLOCKS}
        step={1}
        onChange={(blocks) => update({ blocks })}
        describe={words.blocks.describe}
      />
      <Dial
        label={words.strength.label}
        value={state.strength}
        min={0.1}
        max={1}
        step={0.05}
        onChange={(strength) => update({ strength })}
        describe={words.strength.describe}
      />
      <Toggle
        label={words.shortcut}
        checked={state.shortcut}
        onChange={(shortcut) => update({ shortcut })}
      />
    </>
  );
}
