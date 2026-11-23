import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline } from "@/engine/timeline/timeline";
import type { TimelineFrame } from "./contract";
import type { Snapshot } from "./snapshot/snapshot";
import { useRestoredMoment } from "./use-restored-moment";

const saved = { momentEpoch: 3 } as Snapshot;

function record(timeline: Timeline<TimelineFrame>, epochs: number) {
  for (let epoch = 0; epoch <= epochs; epoch += 1) timeline.record({ epoch, loss: 0 });
}

describe("useRestoredMoment", () => {
  it("still shows the moment when the scene starts its first run after the wait began", () => {
    const timeline = new Timeline<TimelineFrame>();
    renderHook(() => useRestoredMoment(timeline, saved));
    timeline.newRun();
    record(timeline, 5);
    expect(timeline.current()?.epoch).toBe(3);
  });

  it("gives up once a run that had frames is replaced", () => {
    const timeline = new Timeline<TimelineFrame>();
    renderHook(() => useRestoredMoment(timeline, saved));
    record(timeline, 1);
    timeline.newRun();
    record(timeline, 5);
    expect(timeline.getState().live).toBe(true);
    expect(timeline.current()?.epoch).toBe(5);
  });
});
