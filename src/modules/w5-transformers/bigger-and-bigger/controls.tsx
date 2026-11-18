"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LIMITS, type ScaleFrame, type ScaleState } from "./model";

const DIALS = ["brain", "reading", "budget"] as const;

export function ScaleControls({ state, update }: ModuleViewProps<ScaleState, ScaleFrame>) {
  return (
    <>
      {DIALS.map((dial) => (
        <Dial
          key={dial}
          label={words[dial].label}
          value={state[dial]}
          min={LIMITS[dial].min}
          max={LIMITS[dial].max}
          step={0.1}
          onChange={(value) => update({ [dial]: value })}
          describe={words[dial].describe}
        />
      ))}
    </>
  );
}
