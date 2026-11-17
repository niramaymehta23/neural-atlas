"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keyOf, TEAM, type CramFrame, type CramState } from "./model";

const describeOff = (value: number) =>
  value === 0
    ? words.off.none
    : value < 0.3
      ? words.off.few
      : value < 0.6
        ? words.off.half
        : value < 0.9
          ? words.off.most
          : words.off.nearlyAll;

export function CramControls({ state, update, timeline }: ModuleViewProps<CramState, CramFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Waiting for the run these settings ask for.
  const practising = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.off.label}
        value={state.off}
        onChange={(off) => update({ off })}
        describe={describeOff}
      />
      <Dial
        label={words.teamDial.label}
        value={state.team}
        min={TEAM.min}
        max={TEAM.max}
        step={4}
        onChange={(team) => update({ team })}
        describe={(value) => words.teamDial.count(count(value))}
      />
      <button
        type="button"
        disabled={practising}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.practise : practising ? words.practising : words.again}
      </button>
    </>
  );
}
