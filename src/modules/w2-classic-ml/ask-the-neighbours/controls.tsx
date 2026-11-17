"use client";

import { BrushPicker } from "@/features/classic/BrushPicker";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { ASK, LIMITS, type NeighboursState } from "./model";
import { askedWords } from "./scene";

type Props = ModuleViewProps<NeighboursState>;

const describeCloseness = (value: number) =>
  value < 0.05 ? words.closeness.same : value < 0.6 ? words.closeness.some : words.closeness.lots;

export function NeighboursControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.neighbours.label}
        value={state.neighbours}
        min={LIMITS.neighbours.min}
        max={LIMITS.neighbours.max}
        step={1}
        onChange={(neighbours) => update({ neighbours })}
        describe={askedWords}
      />
      <Dial
        label={words.closeness.label}
        value={state.closeness}
        onChange={(closeness) => update({ closeness })}
        describe={describeCloseness}
      />
      <BrushPicker
        value={state.brush}
        onChange={(brush) => update({ brush })}
        words={words.brush}
        first={{ value: ASK, label: words.brush.ask }}
      />
    </>
  );
}
