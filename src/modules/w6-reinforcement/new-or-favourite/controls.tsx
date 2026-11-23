"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { BUDGET, CURIOUS, keyOf, type CasinoState, type RaceFrame } from "./model";

/** The curious bot's curiosity, the bots' pulls, and the race button. */
export function CasinoControls({
  state,
  update,
  timeline,
}: ModuleViewProps<CasinoState, RaceFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.races > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.curious.label}
        value={state.curious}
        min={CURIOUS.min}
        max={CURIOUS.max}
        step={0.01}
        onChange={(curious) => update({ curious })}
        describe={words.curious.describe}
      />
      <Dial
        label={words.budget.label}
        value={state.budget}
        min={BUDGET.min}
        max={BUDGET.max}
        step={BUDGET.step}
        onChange={(budget) => update({ budget })}
        describe={words.budget.describe}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ races }) => ({ races: races + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.races === 0 ? words.race.start : working ? words.race.working : words.race.again}
      </button>
    </>
  );
}
