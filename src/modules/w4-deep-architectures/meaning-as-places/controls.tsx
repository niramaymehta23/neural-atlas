"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keyOf, type MapFrame, type MapState } from "./model";

const describePush = (value: number) =>
  value === 0
    ? words.push.none
    : value < 0.3
      ? words.push.gentle
      : value < 0.7
        ? words.push.firm
        : words.push.hard;

const describeStep = (value: number) =>
  value > 0.75
    ? words.step.giant
    : value > 0.45
      ? words.step.big
      : value > 0.2
        ? words.step.small
        : words.step.tiny;

export function MapControls({ state, update, timeline }: ModuleViewProps<MapState, MapFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.push.label}
        value={state.push}
        onChange={(push) => update({ push })}
        describe={describePush}
      />
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.start : working ? words.working : words.again}
      </button>
    </>
  );
}
