"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { curiosityWords, words } from "./captions";
import { GAMES, keyOf, type PracticeFrame, type PracticeState } from "./model";

export function PracticeControls({
  state,
  update,
  timeline,
}: ModuleViewProps<PracticeState, PracticeFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.games.label}
        value={state.games}
        min={0}
        max={GAMES.length - 1}
        step={1}
        onChange={(games) => update({ games })}
        describe={(value) => words.games.steps[value] ?? ""}
      />
      <Dial
        label={words.curiosity.label}
        value={state.curiosity}
        step={0.05}
        onChange={(curiosity) => update({ curiosity })}
        describe={curiosityWords}
      />
      <Toggle
        label={words.frozen}
        checked={state.frozen}
        onChange={(frozen) => update({ frozen })}
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
