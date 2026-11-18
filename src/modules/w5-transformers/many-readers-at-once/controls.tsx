"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { DEPTHS, READERS, type ReadersFrame, type ReadersState } from "./model";

export function ReadersControls({ state, update }: ModuleViewProps<ReadersState, ReadersFrame>) {
  const on = READERS - state.off.length;
  return (
    <>
      <Dial
        label={words.count.label}
        value={on}
        min={0}
        max={READERS}
        step={1}
        // Keeps the first readers on and switches the rest off.
        onChange={(count) =>
          update({ off: Array.from({ length: READERS - count }, (_, at) => READERS - at) })
        }
        describe={words.count.describe}
      />
      <Dial
        label={words.depth.label}
        value={state.depth}
        min={1}
        max={DEPTHS}
        step={1}
        onChange={(depth) => update({ depth })}
        describe={words.depth.describe}
      />
    </>
  );
}
