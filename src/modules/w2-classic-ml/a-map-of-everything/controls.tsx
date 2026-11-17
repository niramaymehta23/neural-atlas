"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { DATA, LIMITS, type MapData, type MapFrame, type MapState } from "./model";

type Props = ModuleViewProps<MapState, MapFrame>;

const DATA_OPTIONS = DATA.map((value) => ({ value, label: words.data[value] }));

const describePerplexity = (value: number) =>
  value <= 5 ? words.perplexity.few : value <= 20 ? words.perplexity.some : words.perplexity.many;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

/** A new map: new things, neighbours or jumble start again from the first step. */
const FRESH = { steps: 0, running: false };

export function MapControls({ state, update }: Props) {
  const done = state.steps >= LIMITS.steps.max;
  return (
    <>
      <SegmentedControl
        label={words.data.label}
        showLabel
        options={DATA_OPTIONS}
        value={state.data}
        onChange={(data: MapData) => update({ data, ...FRESH })}
      />
      <Dial
        label={words.count.label}
        value={state.count}
        min={LIMITS.count.min}
        max={LIMITS.count.max}
        step={LIMITS.count.step}
        onChange={(things) => update({ count: things, ...FRESH })}
        describe={(value) => words.count.describe(count(value))}
      />
      <Dial
        label={words.perplexity.label}
        value={state.perplexity}
        min={LIMITS.perplexity.min}
        max={LIMITS.perplexity.max}
        step={1}
        onChange={(perplexity) => update({ perplexity, ...FRESH })}
        describe={describePerplexity}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={done && !state.running}
          onClick={() => update(({ running }) => ({ running: !running }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.running ? words.pause : words.settle}
        </button>
        <button
          type="button"
          onClick={() =>
            update(({ attempt }) => ({
              attempt: attempt >= LIMITS.attempt.max ? 0 : attempt + 1,
              ...FRESH,
            }))
          }
          className={BUTTON}
        >
          {words.again}
        </button>
      </div>
    </>
  );
}
