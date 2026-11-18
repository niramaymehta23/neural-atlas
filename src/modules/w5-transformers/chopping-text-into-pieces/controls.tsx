"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { BYTES, LONGEST, mergesOf, type PiecesFrame, type PiecesState } from "./model";

export function PiecesControls({ state, update }: ModuleViewProps<PiecesState, PiecesFrame>) {
  return (
    <>
      <Dial
        label={words.known.label}
        value={state.known}
        min={0}
        max={1}
        step={0.01}
        onChange={(known) => update({ known })}
        describe={(value) => words.known.describe(count(BYTES + mergesOf(value)))}
      />
      <Dial
        label={words.longest.label}
        value={state.longest}
        min={1}
        max={LONGEST}
        step={1}
        onChange={(longest) => update({ longest })}
        describe={(value) =>
          value === 1 ? words.longest.one : words.longest.describe(count(value), value >= LONGEST)
        }
      />
    </>
  );
}
