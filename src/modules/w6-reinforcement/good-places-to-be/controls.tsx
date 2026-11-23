"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { BRUSHES, keyOf, type GlowFrame, type GlowState } from "./model";

type Props = ModuleViewProps<GlowState, GlowFrame>;

const BRUSH_OPTIONS = BRUSHES.map((value) => ({ value, label: words.brush[value] }));

export const dialWords = {
  care: (value: number) =>
    value < 0.35 ? words.care.now : value < 0.75 ? words.care.soon : words.care.later,
  slippery: (value: number) =>
    value < 0.02
      ? words.slippery.still
      : value < 0.35
        ? words.slippery.little
        : value < 0.75
          ? words.slippery.some
          : words.slippery.very,
};

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function GlowControls({ state, update, timeline }: Props) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.care.label}
        value={state.care}
        onChange={(care) => update({ care })}
        describe={dialWords.care}
      />
      <Dial
        label={words.slippery.label}
        value={state.slippery}
        onChange={(slippery) => update({ slippery })}
        describe={dialWords.slippery}
      />
      <SegmentedControl
        label={words.brush.label}
        options={BRUSH_OPTIONS}
        value={BRUSHES.find((brush) => brush === state.brush) ?? "wall"}
        onChange={(brush) => update({ brush })}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => {
          timeline.goLive();
          update(({ runs }) => ({ runs: runs + 1 }));
        }}
        className={BUTTON}
      >
        {state.runs === 0 ? words.spread : working ? words.working : words.again}
      </button>
    </>
  );
}
