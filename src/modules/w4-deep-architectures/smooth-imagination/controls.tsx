"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { ACROSS, TIDY, type MapFrame, type MapState } from "./model";

export function MapControls({ state, update }: ModuleViewProps<MapState, MapFrame>) {
  return (
    <>
      <Dial
        label={words.tidy.label}
        value={state.tidy}
        min={TIDY.min}
        max={TIDY.most}
        step={1}
        onChange={(tidy) => update({ tidy })}
        describe={(value) => words.tidy.names[value] ?? words.tidy.names[0]}
      />
      <Dial
        label={words.across.label}
        value={state.across}
        min={ACROSS.min}
        max={ACROSS.most}
        step={1}
        onChange={(across) => update({ across })}
        describe={(value) => words.across.many(count(value))}
      />
    </>
  );
}
