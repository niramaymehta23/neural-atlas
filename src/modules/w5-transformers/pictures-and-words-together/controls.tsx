"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { keepInPile, THRESHOLD, TRICKS, type PicturesFrame, type PicturesState } from "./model";

export function PicturesControls({ state, update }: ModuleViewProps<PicturesState, PicturesFrame>) {
  return (
    <>
      <Dial
        label={words.threshold.label}
        value={state.threshold}
        min={THRESHOLD.min}
        max={THRESHOLD.max}
        step={0.05}
        onChange={(threshold) => update({ threshold })}
        describe={words.threshold.describe}
      />
      <Dial
        label={words.tricks.label}
        value={state.tricks}
        min={0}
        max={TRICKS}
        step={1}
        onChange={(tricks) =>
          update(({ placed }) => ({ tricks, placed: keepInPile(placed, tricks), holding: -1 }))
        }
        describe={words.tricks.describe}
      />
    </>
  );
}
