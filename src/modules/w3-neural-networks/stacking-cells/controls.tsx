"use client";

import { GroupMark } from "@/data/GroupMark";
import { count } from "@/design/copy";
import { companionStore } from "@/platform/companion/companion";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { hiddenOf, LIMITS, type CellsFrame, type CellsState } from "./model";

type Props = ModuleViewProps<CellsState, CellsFrame>;

/** Brushes are named by the flower and show its shape, not only its colour (A11Y-08). */
const BRUSHES = [
  { value: "0", label: words.brush.daisies, icon: <GroupMark group={0} /> },
  { value: "1", label: words.brush.tulips, icon: <GroupMark group={1} /> },
] as const;

const describeStep = (value: number) =>
  value > 0.66 ? words.step.big : value > 0.25 ? words.step.medium : words.step.small;

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

export function CellsControls({ state, update, side }: Props) {
  /** A new team shape starts practice afresh, and becomes the learner's own network. */
  const reshape = (shape: Partial<Pick<CellsState, "layers" | "cells">>) => {
    const next = { layers: state.layers, cells: state.cells, ...shape };
    update({ ...next, epochs: 0 });
    if (side === "main") companionStore.update({ hidden: hiddenOf(next) });
  };
  return (
    <>
      <Dial
        label={words.layers.label}
        value={state.layers}
        min={LIMITS.layers.min}
        max={LIMITS.layers.max}
        step={1}
        onChange={(layers) => reshape({ layers })}
        describe={(value) => (value === 1 ? words.layers.one : words.layers.describe(count(value)))}
      />
      <Dial
        label={words.cells.label}
        value={state.cells}
        min={LIMITS.cells.min}
        max={LIMITS.cells.max}
        step={1}
        onChange={(cells) => reshape({ cells })}
        describe={(value) => (value === 1 ? words.cells.one : words.cells.describe(count(value)))}
      />
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <SegmentedControl
        label={words.brush.label}
        showLabel
        options={BRUSHES}
        value={String(state.brush) as "0" | "1"}
        onChange={(brush) => update({ brush: Number(brush) })}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => update(({ learning }) => ({ learning: !learning }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.learning ? words.pause : words.learn}
        </button>
        <button
          type="button"
          onClick={() => update(({ attempt }) => ({ attempt: attempt + 1, epochs: 0 }))}
          className={BUTTON}
        >
          {words.newTry}
        </button>
      </div>
    </>
  );
}
