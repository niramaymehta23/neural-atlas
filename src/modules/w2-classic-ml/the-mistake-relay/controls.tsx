"use client";

import { useId } from "react";
import { count } from "@/design/copy";
import { hasBothGroups } from "@/features/classic/garden";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LIMITS, type RelayFrame, type RelayState } from "./model";

type Props = ModuleViewProps<RelayState, RelayFrame>;

const describePush = (value: number) =>
  value < 0.3 ? words.push.gentle : value < 0.7 ? words.push.medium : words.push.hard;
const describeSize = (value: number) =>
  value === 1 ? words.size.one : words.size.many(count(value));

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function RelayControls({ state, update }: Props) {
  const hintId = useId();
  const ready = hasBothGroups(state.points);
  const full = state.runners >= LIMITS.runners.max;
  const add = (more: number) =>
    update(({ runners }) => ({ runners: Math.min(LIMITS.runners.max, runners + more) }));
  return (
    <>
      <Dial
        label={words.push.label}
        value={state.push}
        min={LIMITS.push.min}
        max={LIMITS.push.max}
        onChange={(push) => update({ push, runners: 0 })}
        describe={describePush}
      />
      <Dial
        label={words.size.label}
        value={state.size}
        min={LIMITS.size.min}
        max={LIMITS.size.max}
        step={1}
        onChange={(size) => update({ size, runners: 0 })}
        describe={describeSize}
      />
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!ready || full}
            aria-describedby={hintId}
            onClick={() => add(1)}
            className={`${BUTTON} text-accent-ink`}
          >
            {words.add}
          </button>
          <button
            type="button"
            disabled={!ready || full}
            aria-describedby={hintId}
            onClick={() => add(10)}
            className={BUTTON}
          >
            {words.addTen}
          </button>
          <button type="button" onClick={() => update({ runners: 0 })} className={BUTTON}>
            {words.again}
          </button>
        </div>
        <p id={hintId} className="min-h-5 text-sm text-ink-soft">
          {!ready ? words.needNests : full ? words.allRunners : ""}
        </p>
      </div>
    </>
  );
}
