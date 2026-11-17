"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import { TimelineScrubber } from "@/ui/TimelineScrubber";
import type { TimelineFrame } from "./contract";
import { advanceReplay, type ReplayWindow } from "./missions/missions";

type TimelineBarProps = {
  timeline: Timeline<TimelineFrame>;
  /** A mission replay in progress: plays only its window, then calls `onReplayEnd(true)`. */
  replay: ReplayWindow | null;
  /** `finished` is true when the replay ran to its end, false when the learner took over. */
  onReplayEnd: (finished: boolean) => void;
};

/** The stage 01 scrubber bound to a lesson's Timeline, ticking playback from the frame loop. */
export function TimelineBar({ timeline, replay, onReplayEnd }: TimelineBarProps) {
  const state = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);

  useEffect(() => {
    if (!state.playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      if (replay) {
        if (!advanceReplay(timeline, replay, seconds)) return onReplayEnd(true);
      } else timeline.tick(seconds);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.playing, timeline, replay, onReplayEnd]);

  const frames = timeline.frames();
  return (
    <TimelineScrubber
      length={state.length}
      position={state.cursor}
      playing={state.playing}
      live={state.live}
      onLive={() => {
        onReplayEnd(false);
        timeline.goLive();
      }}
      onPlayToggle={() => {
        onReplayEnd(false);
        if (state.playing) timeline.pause();
        else timeline.play();
      }}
      onSeek={(position) => {
        onReplayEnd(false);
        timeline.seek(position);
      }}
      losses={frames.map(({ loss }) => loss)}
      ghostLosses={timeline.ghostFrames().map(({ loss }) => loss)}
    />
  );
}
