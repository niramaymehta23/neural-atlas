"use client";

import { useEffect, useRef } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "@/platform/contract";

/**
 * Records what a lesson that does not train shows now, each time it changes, so missions and
 * guesses judge what is on screen. `frame` (without its count) must keep its identity until
 * something changes (build it in useMemo); null while the lesson's files are on their way.
 */
export function useShownFrame<F extends TimelineFrame>(
  timeline: Timeline<F>,
  frame: Omit<F, "epoch"> | null,
) {
  const recorded = useRef(0);
  useEffect(() => {
    if (!frame) return;
    recorded.current += 1;
    timeline.record({ ...frame, epoch: recorded.current } as F);
  }, [frame, timeline]);
}
