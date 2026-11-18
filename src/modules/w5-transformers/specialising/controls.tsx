"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LEARNING, MOST_MIX, MOST_STEPS, type TuneFrame, type TuneState } from "./model";
import { FRESH } from "./scene";

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function TuneControls({ state, update }: ModuleViewProps<TuneState, TuneFrame>) {
  const done = state.steps >= MOST_STEPS;
  return (
    <>
      <Dial
        label={words.learning.label}
        value={state.learning}
        min={LEARNING.min}
        max={LEARNING.max}
        step={0.0005}
        onChange={(learning) => update({ learning, ...FRESH })}
        describe={words.learning.describe}
      />
      <Dial
        label={words.mix.label}
        value={state.mix}
        min={0}
        max={MOST_MIX}
        step={0.05}
        onChange={(mix) => update({ mix, ...FRESH })}
        describe={words.mix.describe}
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
        <button type="button" onClick={() => update(FRESH)} className={BUTTON}>
          {words.again}
        </button>
      </div>
    </>
  );
}
