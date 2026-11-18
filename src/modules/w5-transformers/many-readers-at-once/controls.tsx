"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { DEPTHS, type ReadersFrame, type ReadersState } from "./model";

export function ReadersControls({ state, update }: ModuleViewProps<ReadersState, ReadersFrame>) {
  return (
    <Dial
      label={words.depth.label}
      value={state.depth}
      min={1}
      max={DEPTHS}
      step={1}
      onChange={(depth) => update({ depth })}
      describe={words.depth.describe}
    />
  );
}
