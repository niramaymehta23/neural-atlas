"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LIMITS, type SortState } from "./model";

type Props = ModuleViewProps<SortState>;

const describeRare = (value: number) => words.rare.describe(count(value), value === 1);
const describeThreshold = (value: number) =>
  value >= 0.99
    ? words.threshold.never
    : value < 0.35
      ? words.threshold.jumpy
      : value < 0.7
        ? words.threshold.middle
        : words.threshold.relaxed;

export function SortControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.rare.label}
        value={state.rare}
        min={LIMITS.rare.min}
        max={LIMITS.rare.max}
        step={1}
        onChange={(rare) => update({ rare })}
        describe={describeRare}
      />
      <Dial
        label={words.threshold.label}
        value={1 - state.threshold}
        onChange={(suspicion) => update({ threshold: Math.round((1 - suspicion) * 100) / 100 })}
        describe={(suspicion) => describeThreshold(1 - suspicion)}
      />
    </>
  );
}
