"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { Toggle } from "@/ui/Toggle";
import { words } from "./captions";
import { MOST_AMOUNT, NEAREST, type PlacesFrame, type PlacesState } from "./model";

export function PlacesControls({ state, update }: ModuleViewProps<PlacesState, PlacesFrame>) {
  return (
    <>
      <Dial
        label={words.amount.label}
        value={state.amount}
        min={0}
        max={MOST_AMOUNT}
        step={0.05}
        onChange={(amount) => update({ amount })}
        describe={words.amount.describe}
      />
      <Dial
        label={words.shown.label}
        value={state.shown}
        min={NEAREST.min}
        max={NEAREST.max}
        step={1}
        onChange={(shown) => update({ shown })}
        describe={words.shown.describe}
      />
      <Toggle label={words.skip} checked={state.skip} onChange={(skip) => update({ skip })} />
    </>
  );
}
