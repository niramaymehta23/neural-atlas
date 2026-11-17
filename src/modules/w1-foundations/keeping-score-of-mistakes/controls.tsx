"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { ScoreFrame, ScoreState } from "./model";
import { stage, strictWord } from "./scene";

const describeRare = (value: number) =>
  value < 0.08 ? words.rare.none : value < 0.6 ? words.rare.few : words.rare.lots;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function ScoreControls({
  state,
  update,
  timeline,
}: ModuleViewProps<ScoreState, ScoreFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const now = stage(state, timeline.at(length - 1));
  return (
    <>
      <Dial
        label={words.strict.label}
        value={state.strict}
        onChange={(strict) => update({ strict })}
        describe={strictWord}
      />
      <Dial
        label={words.rare.label}
        value={state.rare}
        onChange={(rare) => update({ rare })}
        describe={describeRare}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={now === "walking"}
          onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
          className={BUTTON}
        >
          {state.runs > 0 ? words.again : words.start}
        </button>
      </div>
    </>
  );
}
