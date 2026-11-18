"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { MOST_ADDED, MOST_SEED, type NextFrame, type NextState } from "./model";

export function NextControls({ state, update }: ModuleViewProps<NextState, NextFrame>) {
  return (
    <>
      <Dial
        label={words.length.label}
        value={state.added}
        min={0}
        max={MOST_ADDED}
        step={1}
        onChange={(added) => update({ added })}
        describe={words.length.describe}
      />
      <Dial
        label={words.roll.label}
        value={state.seed}
        min={1}
        max={MOST_SEED}
        step={1}
        onChange={(seed) => update({ seed })}
        describe={words.roll.describe}
      />
      <Toggle
        label={words.likeliest}
        checked={state.likeliest}
        onChange={(likeliest) => update({ likeliest })}
      />
    </>
  );
}
