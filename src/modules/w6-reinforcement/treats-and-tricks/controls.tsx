"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { BIG, withDials, type TreatsFrame, type TreatsState } from "./model";

/**
 * The two dials. A turn keeps the old setting in the log for the rounds already played, so the
 * run (and a link to it) replays every round with the dials it had then.
 */
export function TreatsControls({
  state,
  update,
  timeline,
}: ModuleViewProps<TreatsState, TreatsFrame>) {
  const turn = (change: Partial<Pick<TreatsState, "big" | "playful">>) => {
    timeline.goLive();
    update((now) => ({ ...change, log: withDials(now) }));
  };
  return (
    <>
      <Dial
        label={words.big.label}
        value={state.big}
        min={BIG.min}
        max={BIG.max}
        step={0.1}
        onChange={(big) => turn({ big })}
        describe={words.big.describe}
      />
      <Dial
        label={words.playful.label}
        value={state.playful}
        onChange={(playful) => turn({ playful })}
        describe={words.playful.describe}
      />
    </>
  );
}
