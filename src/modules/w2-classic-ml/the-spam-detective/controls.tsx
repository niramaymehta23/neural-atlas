"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { SpamState } from "./model";

type Props = ModuleViewProps<SpamState>;

const describeCaution = (value: number) =>
  value < 0.3 ? words.caution.bold : value < 0.7 ? words.caution.middle : words.caution.careful;
const describeSuspicion = (value: number) =>
  value < 0.3 ? words.suspicion.quick : value < 0.7 ? words.suspicion.middle : words.suspicion.slow;

export function SpamControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.caution.label}
        value={state.caution}
        onChange={(caution) => update({ caution })}
        describe={describeCaution}
      />
      <Dial
        label={words.suspicion.label}
        value={state.suspicion}
        onChange={(suspicion) => update({ suspicion })}
        describe={describeSuspicion}
      />
      <button
        type="button"
        onClick={() => update({ message: words.grandma })}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm md:min-h-0"
      >
        {words.example}
      </button>
    </>
  );
}
