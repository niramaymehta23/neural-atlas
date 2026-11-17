"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keyOf, LIMITS, type StudyFrame, type StudyState } from "./model";

type Props = ModuleViewProps<StudyState, StudyFrame>;

export function StudyControls({ state, update, timeline }: Props) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  // Waiting for the practice these dials ask for (it comes once the dials rest).
  const working = state.runs > 0 && timeline.at(length - 1)?.key !== keyOf(state);
  return (
    <>
      <Dial
        label={words.cells.label}
        value={state.cells}
        min={LIMITS.cells.min}
        max={LIMITS.cells.max}
        step={1}
        onChange={(cells) => update({ cells })}
        describe={(value) => (value === 1 ? words.cells.one : words.cells.describe(count(value)))}
      />
      <Dial
        label={words.questions.label}
        value={state.questions}
        min={LIMITS.questions.min}
        max={LIMITS.questions.max}
        step={1}
        onChange={(questions) => update({ questions })}
        describe={(value) => words.questions.describe(count(value))}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
      >
        {state.runs === 0 ? words.practice : working ? words.working : words.again}
      </button>
    </>
  );
}
