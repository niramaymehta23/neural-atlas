"use client";

import { useEffect, useRef } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import type { TreatsFrame } from "./model";

/** What makes two frames the same moment of the same run. */
const signOf = (frame: TreatsFrame) =>
  `${frame.key}|${frame.epoch}|${frame.trick}|${frame.shares.join(",")}|${frame.treated.join(",")}`;

/**
 * Keeps the timeline holding every round of the run on screen: a treat adds the next round's
 * frame to the same run; anything that changes an earlier round (a new puppy, a dial turned)
 * records the whole run afresh, so the old one becomes the ghost.
 */
export function useRunFrames(timeline: Timeline<TreatsFrame>, frames: readonly TreatsFrame[]) {
  const recorded = useRef<string[]>([]);
  useEffect(() => {
    const signs = frames.map(signOf);
    const old = recorded.current;
    let same = 0;
    while (same < old.length && same < signs.length && old[same] === signs[same]) same += 1;
    if (same < old.length || timeline.getState().length !== old.length) {
      timeline.newRun();
      same = 0;
    }
    for (const frame of frames.slice(same)) timeline.record(frame);
    recorded.current = signs;
  }, [frames, timeline]);
}
