"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { DEPTHS, READERS, type LookingFrame, type LookingState } from "./model";

const describeDepth = (depth: number) =>
  depth <= 1 ? words.depth.first : depth <= 3 ? words.depth.closer : words.depth.deep;

const describeReader = (reader: number) =>
  reader === 0 ? words.reader.all : words.reader.one(count(reader));

export function LookingControls({ state, update }: ModuleViewProps<LookingState, LookingFrame>) {
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
        onChange={(reader) => update({ reader })}
        describe={describeReader}
      />
      {state.focus >= 0 && (
        <button
          type="button"
          onClick={() => update({ focus: -1 })}
          className="rounded-pill border border-hairline bg-paper px-4 py-2 text-sm"
        >
          {words.everyone}
        </button>
      )}
    </>
  );
}
