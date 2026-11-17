"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keyOf, planFor, type PlanFrame, type PlanState } from "./model";

const describeBold = (value: number) =>
  value > 0.75
    ? words.bold.wild
    : value > 0.45
      ? words.bold.bold
      : value > 0.2
        ? words.bold.steady
        : words.bold.timid;

const describeCareful = (value: number) =>
  value > 0.85
    ? words.careful.stop
    : value > 0.45
      ? words.careful.lots
      : value > 0.05
        ? words.careful.little
        : words.careful.same;

export function PlanControls({ state, update, timeline }: ModuleViewProps<PlanState, PlanFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Waiting for the walk this plan asks for (it comes once the plan rests).
  const rolling = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.bold.label}
        value={state.bold}
        onChange={(bold) => update({ bold, plan: planFor(bold, state.careful) })}
        describe={describeBold}
      />
      <Dial
        label={words.careful.label}
        value={state.careful}
        onChange={(careful) => update({ careful, plan: planFor(state.bold, careful) })}
        describe={describeCareful}
      />
      <button
        type="button"
        disabled={rolling}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.roll : rolling ? words.rolling : words.again}
      </button>
    </>
  );
}
