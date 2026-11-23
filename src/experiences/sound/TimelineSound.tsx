"use client";

import { useEffect } from "react";
import { useStore } from "zustand";
import type { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "@/platform/contract";
import { PaperCard } from "@/ui/PaperCard";
import { award } from "../achievements/achievements";
import { playChime, playNote, soundStore, tenths, turnSoundOff } from "./sound";
import { SoundToggle } from "./SoundToggle";

/**
 * A lesson's training as sound: a note per moment shown (live, replayed or scrubbed), as high as
 * its mistakes are against the worst of the run; a chime each time the best gets a tenth better.
 */
export function TimelineSound({ timeline }: { timeline: Timeline<TimelineFrame> }) {
  const on = useStore(soundStore, (state) => state.on);

  useEffect(() => {
    if (!on) return;
    let run = -1;
    let shown: TimelineFrame | undefined;
    let worst = 0;
    let best = 0;
    const listen = () => {
      const frame = timeline.current();
      if (!frame || frame === shown) return;
      shown = frame;
      const now = timeline.getState().run;
      const fresh = now !== run;
      if (fresh) {
        run = now;
        worst = 0;
        best = 0;
        for (const { loss } of timeline.frames())
          if (Number.isFinite(loss)) worst = Math.max(worst, loss);
      }
      if (!Number.isFinite(frame.loss)) return;
      worst = Math.max(worst, frame.loss);
      const off = worst > 0 ? frame.loss / worst : 0;
      playNote(off);
      void award("sound");
      const reached = tenths(1 - off);
      if (!fresh && reached > best) playChime();
      best = Math.max(best, reached);
    };
    return timeline.subscribe(listen);
  }, [on, timeline]);

  // Leaving the lesson is leaving the sound.
  useEffect(() => turnSoundOff, []);

  return (
    <PaperCard>
      <SoundToggle />
    </PaperCard>
  );
}
