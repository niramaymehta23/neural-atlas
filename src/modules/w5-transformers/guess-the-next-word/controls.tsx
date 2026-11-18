"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import type { NextFrame, NextState } from "./model";

export function NextControls({ state, update }: ModuleViewProps<NextState, NextFrame>) {
  return (
    <Toggle
      label={words.likeliest}
      checked={state.likeliest}
      onChange={(likeliest) => update({ likeliest })}
    />
  );
}
