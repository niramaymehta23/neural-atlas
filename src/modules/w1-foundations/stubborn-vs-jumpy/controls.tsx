"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LIMITS, type DartsState } from "./model";

const describeBendy = (value: number) =>
  value === 0
    ? words.bendy.never
    : value === 1
      ? words.bendy.straight
      : value <= 3
        ? words.bendy.little
        : value <= 6
          ? words.bendy.lots
          : words.bendy.wild;

export function DartsControls({ state, update }: ModuleViewProps<DartsState>) {
  return (
    <>
      <Dial
        label={words.bendy.label}
        value={state.bendy}
        min={LIMITS.bendy.min}
        max={LIMITS.bendy.max}
        step={1}
        onChange={(bendy) => update({ bendy })}
        describe={describeBendy}
      />
      <Dial
        label={words.examples.label}
        value={state.examples}
        min={LIMITS.examples.min}
        max={LIMITS.examples.max}
        step={1}
        onChange={(examples) => update({ examples })}
        describe={(value) => words.examples.describe(count(value))}
      />
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => update(({ throws }) => ({ throws: throws + 1 }))}
          className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0"
        >
          {words.throwAgain}
        </button>
        <p className="text-xs text-ink-soft">{words.throwHint}</p>
      </div>
    </>
  );
}
