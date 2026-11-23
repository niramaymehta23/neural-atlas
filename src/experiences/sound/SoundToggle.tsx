"use client";

import { useStore } from "zustand";
import { Toggle } from "@/ui/Toggle";
import { soundCaptions as words } from "./captions";
import { soundStore, turnSoundOff, turnSoundOn } from "./sound";

/** The sound switch. Off until it is tapped, every time the page opens. */
export function SoundToggle() {
  const { on, failed } = useStore(soundStore);
  return (
    <div className="flex flex-col gap-1">
      <Toggle
        label={words.toggle}
        checked={on}
        onChange={(next) => (next ? turnSoundOn() : turnSoundOff())}
      />
      <p className="max-w-64 text-sm text-ink-soft" role={failed ? "alert" : undefined}>
        {failed ? words.failed : words.note}
      </p>
    </div>
  );
}
