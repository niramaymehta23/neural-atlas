"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { MEMORY_STOPS, MOST_GAMES, RATE_STOPS, type CatchFrame, type CatchState } from "./model";

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";
/** A new setting starts a fresh run from the first game. */
export const FRESH = { steps: 0, running: false };

export function CatchControls({ state, update }: ModuleViewProps<CatchState, CatchFrame>) {
  const done = state.steps >= MOST_GAMES;
  return (
    <>
      <Dial
        label={words.memory.label}
        value={state.memory}
        min={0}
        max={MEMORY_STOPS.length - 1}
        step={1}
        onChange={(memory) => update({ memory, ...FRESH })}
        describe={words.memory.describe}
      />
      <Dial
        label={words.learning.label}
        value={state.learning}
        min={0}
        max={RATE_STOPS.length - 1}
        step={1}
        onChange={(learning) => update({ learning, ...FRESH })}
        describe={words.learning.describe}
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
