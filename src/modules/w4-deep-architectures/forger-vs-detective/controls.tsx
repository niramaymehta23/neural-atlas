"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keyOf, TRIES, type DuelFrame, type DuelState } from "./model";

const describeSpeed = (value: number) =>
  value > 0.85
    ? words.speed.rushing
    : value > 0.55
      ? words.speed.fast
      : value > 0.25
        ? words.speed.steady
        : words.speed.slow;

export function DuelControls({ state, update, timeline }: ModuleViewProps<DuelState, DuelFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.forger.label}
        value={state.forger}
        onChange={(forger) => update({ forger })}
        describe={describeSpeed}
      />
      <Dial
        label={words.detective.label}
        value={state.detective}
        onChange={(detective) => update({ detective })}
        describe={describeSpeed}
      />
      <Dial
        label={words.tries.label}
        value={state.tries}
        min={TRIES.min}
        max={TRIES.max}
        step={1}
        onChange={(tries) => update({ tries })}
        describe={(value) => (value === 1 ? words.tries.one : words.tries.many(count(value)))}
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
