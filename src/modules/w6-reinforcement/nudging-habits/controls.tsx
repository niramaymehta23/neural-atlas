"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { newestOf } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { BATCH, keyOf, WILD, type HabitFrame, type HabitState } from "./model";

type Props = ModuleViewProps<HabitState, HabitFrame>;

/** The nudge dial's words, in bands that match what the puppy really does (WILD is measured). */
export const nudgeWords = (value: number) =>
  value >= WILD
    ? words.nudge.wild
    : value >= 0.65
      ? words.nudge.hard
      : value >= 0.3
        ? words.nudge.firm
        : value >= 0.12
          ? words.nudge.gentle
          : words.nudge.tiny;

export const batchWords = (value: number) =>
  value === 1 ? words.batch.one : words.batch.many(count(value));

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function HabitControls({ state, update, timeline }: Props) {
  useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && newestOf(timeline)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.nudge.label}
        value={state.nudge}
        onChange={(nudge) => update({ nudge })}
        describe={nudgeWords}
      />
      <Dial
        label={words.batch.label}
        value={state.batch}
        min={BATCH.min}
        max={BATCH.max}
        step={1}
        onChange={(batch) => update({ batch })}
        describe={batchWords}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={working}
          onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.runs === 0 ? words.start : working ? words.working : words.again}
        </button>
        <button
          type="button"
          disabled={working}
          onClick={() => update(({ runs, attempt }) => ({ runs: runs + 1, attempt: attempt + 1 }))}
          className={BUTTON}
        >
          {words.another}
        </button>
      </div>
    </>
  );
}
