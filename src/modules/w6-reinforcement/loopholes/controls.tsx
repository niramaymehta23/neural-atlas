"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { keyOf, type LoopholeFrame, type LoopholeState } from "./model";

/** Each dial's words, in bands that match what the robot really does there. */
export const dialWords = {
  boxTreat: (value: number) =>
    value < 0.02
      ? words.boxTreat.none
      : value < 0.35
        ? words.boxTreat.small
        : value < 0.75
          ? words.boxTreat.medium
          : words.boxTreat.big,
  moveCost: (value: number) =>
    value < 0.02
      ? words.moveCost.free
      : value < 0.3
        ? words.moveCost.little
        : value < 0.6
          ? words.moveCost.fair
          : words.moveCost.lots,
};

export function LoopholeControls({
  state,
  update,
  timeline,
}: ModuleViewProps<LoopholeState, LoopholeFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      {(["boxTreat", "moveCost"] as const).map((dial) => (
        <Dial
          key={dial}
          label={words[dial].label}
          value={state[dial]}
          onChange={(value) => update({ [dial]: value })}
          describe={dialWords[dial]}
        />
      ))}
      <Toggle
        label={words.pickup}
        checked={state.pickup}
        onChange={(pickup) => update({ pickup })}
      />
      <Toggle
        label={words.closer}
        checked={state.closer}
        onChange={(closer) => update({ closer })}
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
