"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
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

/** A replay moves on by at most this much between two frames. */
const MOST_SECONDS = 0.25;

/** The stage 01 scrubber bound to a lesson's Timeline, ticking playback from the frame loop. */
export function TimelineBar({ timeline, replay, onReplayEnd }: TimelineBarProps) {
  const state = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);

  useEffect(() => {
    if (!state.playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // A tab that was hidden carries on where it stopped, rather than leaping over the time away.
      const seconds = Math.min((now - last) / 1000, MOST_SECONDS);
      last = now;
      if (replay) {
        if (!advanceReplay(timeline, replay, seconds)) return onReplayEnd(true);
      } else timeline.tick(seconds);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.playing, timeline, replay, onReplayEnd]);

  // The same lists while nothing new is recorded, so a replay moves the thumb and redraws no line.
  const frames = timeline.frames();
  const ghost = timeline.ghostFrames();
  const losses = useMemo(() => frames.map(({ loss }) => loss), [frames]);
  const ghostLosses = useMemo(() => ghost.map(({ loss }) => loss), [ghost]);
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
      losses={losses}
      ghostLosses={ghostLosses}
    />
  );
}
