"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { OrderFrame, OrderState } from "./model";

export function OrderControls({ state, update }: ModuleViewProps<OrderState, OrderFrame>) {
  return (
    <>
      <Dial
        label={words.strength.label}
        value={state.strength}
        min={0}
        max={1}
        step={0.05}
        onChange={(strength) => update({ strength })}
        describe={words.strength.describe}
      />
      <Dial
        label={words.speed.label}
        value={state.speed}
        min={0}
        max={1}
        step={0.05}
        onChange={(speed) => update({ speed })}
        describe={words.speed.describe}
      />
    </>
  );
}
