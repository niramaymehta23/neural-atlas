"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { CARE, TEACH, type ThumbsFrame, type ThumbsState } from "./model";

/** The picks are made in the scene; the dials set how it learns from them. */
export function ThumbsControls({ state, update }: ModuleViewProps<ThumbsState, ThumbsFrame>) {
  return (
    <>
      <Dial
        label={words.teach.label}
        value={state.teach}
        min={TEACH.min}
        max={TEACH.max}
        step={0.1}
        onChange={(teach) => update({ teach })}
        describe={words.teach.describe}
      />
      <Dial
        label={words.care.label}
        value={state.care}
        min={CARE.min}
        max={CARE.max}
        step={0.1}
        onChange={(care) => update({ care })}
        describe={words.care.describe}
      />
      <p className="text-sm text-ink-soft">{words.made(state.picks.length)}</p>
    </>
  );
}
