"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { FUTURES, LENGTHS, type AheadFrame, type AheadState } from "./model";

/** The two dials of its imagination; the game itself is played on the board. */
export function AheadControls({ state, update }: ModuleViewProps<AheadState, AheadFrame>) {
  return (
    <>
      <Dial
        label={words.futures.label}
        value={state.futures}
        min={0}
        max={FUTURES.length - 1}
        step={1}
        onChange={(futures) => update({ futures })}
        describe={(value) => words.futures.steps[value] ?? ""}
      />
      <Dial
        label={words.length.label}
        value={state.length}
        min={0}
        max={LENGTHS.length - 1}
        step={1}
        onChange={(length) => update({ length })}
        describe={(value) => words.length.steps[value] ?? ""}
      />
    </>
  );
}
