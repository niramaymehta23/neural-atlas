"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { MOST_BATCHES, MOST_ROUNDS, NO_RAIL, type CoachFrame, type CoachState } from "./model";

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";
/** A new setting starts a fresh run from the first batch. */
export const FRESH = { steps: 0, running: false };

export function CoachControls({ state, update }: ModuleViewProps<CoachState, CoachFrame>) {
  const done = state.steps >= MOST_BATCHES;
  return (
    <>
      <Dial
        label={words.clip.label}
        value={state.clip}
        min={0}
        max={NO_RAIL}
        step={1}
        onChange={(clip) => update({ clip, ...FRESH })}
        describe={words.clip.describe}
      />
      <Dial
        label={words.rounds.label}
        value={state.rounds}
        min={0}
        max={MOST_ROUNDS}
        step={1}
        onChange={(rounds) => update({ rounds, ...FRESH })}
        describe={words.rounds.describe}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={done && !state.running}
          onClick={() => update(({ running }) => ({ running: !running }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.running ? words.pause : words.practise}
        </button>
        <button
          type="button"
          onClick={() => update(({ attempt }) => ({ attempt: attempt + 1, ...FRESH }))}
          className={BUTTON}
        >
          {words.again}
        </button>
      </div>
    </>
  );
}
