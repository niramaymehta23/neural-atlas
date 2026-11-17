import { useCallback, useEffect, useRef } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "./contract";
import type { Snapshot } from "./snapshot/snapshot";

/**
 * Shows a link's saved moment once the scene has rebuilt its run that far: the frame at that
 * epoch (v2) or position (v1). The wait ends for good when the learner changes something or a
 * new run starts, so it never jumps into their own run later. Returns that cancel.
 */
export function useRestoredMoment(
  timeline: Timeline<TimelineFrame>,
  restored: Snapshot | null | undefined,
): () => void {
  const pending = useRef(false);

  useEffect(() => {
    const epoch = restored?.momentEpoch ?? null;
    const index = restored?.momentIndex ?? null;
    if (epoch === null && index === null) return;
    const run = timeline.getState().run;
    pending.current = true;
    const trySeek = () => {
      const { length, run: now } = timeline.getState();
      if (!pending.current || now !== run) return true;
      if (epoch !== null) {
        if ((timeline.at(length - 1)?.epoch ?? -1) < epoch) return false;
        pending.current = false;
        timeline.scrub(epoch);
      } else if (index !== null) {
        if (index >= length) return false;
        pending.current = false;
        timeline.seek(index);
      }
      return true;
    };
    if (trySeek()) return;
    const stop = timeline.subscribe(() => {
      if (trySeek()) stop();
    });
    return stop;
  }, [restored, timeline]);

  return useCallback(() => {
    pending.current = false;
  }, []);
}
