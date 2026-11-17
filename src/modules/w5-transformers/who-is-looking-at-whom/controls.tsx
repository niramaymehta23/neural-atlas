"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { DEPTHS, READERS, type LookingFrame, type LookingState } from "./model";
import { nameReader } from "./readers";

const describeDepth = (depth: number) =>
  depth <= 1 ? words.depth.first : depth <= 3 ? words.depth.closer : words.depth.deep;

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

export function LookingControls({
  state,
  update,
  timeline,
}: ModuleViewProps<LookingState, LookingFrame>) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const frame = timeline.at(length - 1);
  return (
    <>
      <Dial
        label={words.depth.label}
        value={state.depth}
        min={1}
        max={DEPTHS}
        step={1}
        onChange={(depth) => update({ depth })}
        describe={describeDepth}
      />
      <Dial
        label={words.reader.label}
        value={state.reader}
        min={0}
        max={READERS}
        step={1}
        onChange={(reader) => update({ reader, gallery: false })}
        describe={(reader) => nameReader(reader, frame?.habits, frame?.threads.words ?? [])}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          aria-pressed={state.gallery}
          onClick={() => update(({ gallery }) => ({ gallery: !gallery }))}
          className={`${BUTTON} aria-pressed:border-accent aria-pressed:text-accent-ink`}
        >
          {words.gallery.open}
        </button>
        {state.focus >= 0 && !state.gallery && (
          <button type="button" onClick={() => update({ focus: -1 })} className={BUTTON}>
            {words.everyone}
          </button>
        )}
      </div>
    </>
  );
}
