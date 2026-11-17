"use client";

import { useId } from "react";
import { GroupMark } from "@/data/GroupMark";
import { count } from "@/design/copy";
import { companionStore } from "@/platform/companion/companion";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import {
  BENDS,
  canLearn,
  ERASER,
  hiddenOf,
  LIMITS,
  type Bend,
  type CellsFrame,
  type CellsState,
} from "./model";

type Props = ModuleViewProps<CellsState, CellsFrame>;

/** Brushes are named by the flower and show its shape, not only its colour (A11Y-08). */
const BRUSHES = [
  { value: "0", label: words.brush.daisies, icon: <GroupMark group={0} /> },
  { value: "1", label: words.brush.tulips, icon: <GroupMark group={1} /> },
  { value: String(ERASER), label: words.brush.pull },
] as const;
type Brush = (typeof BRUSHES)[number]["value"];

const describeStep = (value: number) =>
  value > 0.66 ? words.step.big : value > 0.25 ? words.step.medium : words.step.small;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

/** One layer's bend, as a plain list: Smooth, Cut-off, Leaky cut-off. */
function BendChooser({
  layer,
  value,
  onChange,
}: {
  layer: number;
  value: Bend;
  onChange: (bend: Bend) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="text-ink-soft">
        {words.bends.label(count(layer + 1))}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as Bend)}
        aria-describedby={`${id}-note`}
        className="min-h-11 rounded-control border border-hairline bg-paper px-2 py-1 md:min-h-0"
      >
        {BENDS.map((bend) => (
          <option key={bend} value={bend}>
            {words.bends[bend]}
          </option>
        ))}
      </select>
      <p id={`${id}-note`} className="max-w-48 text-xs text-ink-soft">
        {words.bends.notes[value]}
      </p>
    </div>
  );
}

export function CellsControls({ state, update, side }: Props) {
  /** A new team shape or bend starts practice afresh, and becomes the learner's own network. */
  const reshape = (shape: Partial<Pick<CellsState, "layers" | "cells" | "bends">>) => {
    const next = { layers: state.layers, cells: state.cells, bends: state.bends, ...shape };
    update({ ...shape, epochs: 0, log: [] });
    if (side !== "main") return;
    companionStore.update({ hidden: hiddenOf(next), activation: next.bends[0] ?? "tanh" });
  };
  const ready = canLearn(state.points);
  const hintId = useId();
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
      <div className="flex flex-wrap justify-center gap-3" data-bends>
        {Array.from({ length: state.layers }, (_, layer) => (
          <BendChooser
            key={layer}
            layer={layer}
            value={state.bends[layer] ?? "tanh"}
            onChange={(bend) =>
              reshape({ bends: state.bends.map((old, index) => (index === layer ? bend : old)) })
            }
          />
        ))}
      </div>
      <SegmentedControl
        label={words.brush.label}
        showLabel
        options={BRUSHES}
        value={String(state.brush) as Brush}
        onChange={(brush) => update({ brush: Number(brush) })}
      />
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!state.learning && !ready}
            aria-describedby={ready ? undefined : hintId}
            onClick={() => update(({ learning }) => ({ learning: !learning }))}
            className={`${BUTTON} text-accent-ink`}
          >
            {state.learning ? words.pause : words.learn}
          </button>
          <button
            type="button"
            onClick={() => update(({ attempt }) => ({ attempt: attempt + 1, epochs: 0, log: [] }))}
            className={BUTTON}
          >
            {words.newTry}
          </button>
        </div>
        {!ready && (
          <p id={hintId} className="text-sm text-ink-soft">
            {words.needFlowers}
          </p>
        )}
      </div>
    </>
  );
}
