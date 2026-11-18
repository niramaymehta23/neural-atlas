"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import type { LookFrame, LookState } from "./model";

export function LookControls({ state, update }: ModuleViewProps<LookState, LookFrame>) {
  return (
    <Toggle label={words.lookUp} checked={state.lookUp} onChange={(lookUp) => update({ lookUp })} />
  );
}
