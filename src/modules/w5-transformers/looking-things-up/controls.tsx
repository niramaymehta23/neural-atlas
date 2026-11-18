"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { LIBRARY, words } from "./captions";
import { NEED, type LookFrame, type LookState } from "./model";

export function LookControls({ state, update }: ModuleViewProps<LookState, LookFrame>) {
  return (
    <>
      <Dial
        label={words.need.label}
        value={state.need}
        min={NEED.min}
        max={NEED.max}
        step={0.05}
        onChange={(need) => update({ need })}
        describe={words.need.describe}
      />
      <Dial
        label={words.listed.label}
        value={state.listed}
        min={1}
        max={LIBRARY.length}
        step={1}
        onChange={(listed) => update({ listed })}
        describe={words.listed.describe}
      />
      <Toggle
        label={words.lookUp}
        checked={state.lookUp}
        onChange={(lookUp) => update({ lookUp })}
      />
    </>
  );
}
