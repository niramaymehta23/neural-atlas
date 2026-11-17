"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { isFinished, isThisWalk, type LineFrame, type LineState } from "./model";

const describeSpread = (value: number) =>
  value > 0.6 ? words.spread.lots : value > 0.2 ? words.spread.some : words.spread.tight;
const describeDots = (value: number) =>
  value > 0.66 ? words.dots.lots : value > 0.25 ? words.dots.some : words.dots.few;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function LineControls({ state, update, timeline }: ModuleViewProps<LineState, LineFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const newest = timeline.at(length - 1);
  const found = isFinished(state, newest);
  const walking = isThisWalk(state, newest) && !found;
  return (
    <>
      <Dial
        label={words.spread.label}
        value={state.spread}
        onChange={(spread) => update({ spread })}
        describe={describeSpread}
      />
      <Dial
        label={words.dots.label}
        value={state.dots}
        onChange={(dots) => update({ dots })}
        describe={describeDots}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={walking}
          onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {found ? words.again : words.find}
        </button>
        <button
          type="button"
          disabled={state.added.length === 0}
          onClick={() => update({ added: [] })}
          className={BUTTON}
        >
          {words.clear}
        </button>
      </div>
    </>
  );
}
