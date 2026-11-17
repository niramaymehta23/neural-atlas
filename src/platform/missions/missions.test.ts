import { Timeline } from "@/engine/timeline/timeline";
import type { Mission, TimelineFrame } from "../contract";
import {
  advanceReplay,
  canReplay,
  createMissionWatcher,
  replayWindow,
  startReplay,
} from "./missions";

type State = { step: number };
const flyOff: Mission<State> = {
  id: "fly-off",
  goal: "Take steps so big the ball flies off",
  success: "Each step jumped right over the valley.",
  replay: { before: 10, after: 5 },
  when: ({ step }) => step > 0.8,
};

describe("missions", () => {
  it("fires a mission once, however long its predicate holds", () => {
    const check = createMissionWatcher([flyOff]);
    expect(check({ step: 0.2 }, undefined)).toEqual([]);
    expect(check({ step: 0.9 }, undefined)).toEqual([flyOff]);
    expect(check({ step: 0.95 }, undefined)).toEqual([]);
    expect(check({ step: 0.1 }, undefined)).toEqual([]);
    expect(check({ step: 0.9 }, undefined)).toEqual([]);
  });

  it("does not fire a mission finished in an earlier visit", () => {
    const check = createMissionWatcher([flyOff]);
    expect(check({ step: 0.9 }, undefined, new Set(["fly-off"]))).toEqual([]);
  });

  it("hands the newest moment to the predicate", () => {
    const when = vi.fn(() => false);
    createMissionWatcher([{ ...flyOff, when }])({ step: 0 }, { epoch: 3, loss: 9 });
    expect(when).toHaveBeenCalledWith({ step: 0 }, { epoch: 3, loss: 9 });
  });

  it("replays exactly the window around the moment it fired", () => {
    const timeline = new Timeline<TimelineFrame>({ framesPerSecond: 10 });
    for (let epoch = 0; epoch < 50; epoch += 1) timeline.record({ epoch: epoch * 2, loss: 1 });
    const window = replayWindow(timeline, 30, flyOff.replay);
    expect(window).toEqual({ fromEpoch: 40, atEpoch: 60, after: 5, run: 0 });

    expect(startReplay(timeline, window!)).toBe(true);
    const seen = [timeline.getState().cursor];
    while (advanceReplay(timeline, window!, 0.1)) seen.push(timeline.getState().cursor);
    seen.push(timeline.getState().cursor);
    expect(seen[0]).toBe(20);
    expect(seen.at(-1)).toBe(35);
    expect(new Set(seen)).toEqual(new Set(Array.from({ length: 16 }, (_, i) => 20 + i)));
    expect(timeline.getState()).toMatchObject({ cursor: 35, playing: false, live: false });
  });

  it("centres on the mission's own moment and plays it slowly when asked", () => {
    const timeline = new Timeline<TimelineFrame>({ framesPerSecond: 30 });
    for (let epoch = 0; epoch <= 120; epoch += 1) timeline.record({ epoch, loss: 1 });
    const replay = { before: 16, after: 2, moment: () => 40, framesPerSecond: 8 };
    const window = replayWindow(timeline, 120, replay)!;
    expect(window).toEqual({ fromEpoch: 24, atEpoch: 40, after: 2, run: 0, framesPerSecond: 8 });
    expect(startReplay(timeline, window)).toBe(true);
    let seconds = 0;
    while (advanceReplay(timeline, window, 1 / 60)) seconds += 1 / 60;
    expect(timeline.current()?.epoch).toBe(42);
    expect(seconds).toBeGreaterThanOrEqual(2);
  });

  it("falls back to the moment it fired when the mission's moment is not recorded", () => {
    const timeline = new Timeline<TimelineFrame>();
    for (let epoch = 0; epoch < 10; epoch += 1) timeline.record({ epoch, loss: 1 });
    const window = replayWindow(timeline, 9, { before: 2, after: 0, moment: () => null });
    expect(window).toEqual({ fromEpoch: 7, atEpoch: 9, after: 0, run: 0 });
  });

  it("keeps its window when the timeline drops old frames", () => {
    const timeline = new Timeline<TimelineFrame>({ capacity: 5 });
    for (let epoch = 0; epoch < 5; epoch += 1) timeline.record({ epoch, loss: 1 });
    const window = replayWindow(timeline, 4, { before: 2, after: 0 })!;
    for (let epoch = 5; epoch < 8; epoch += 1) timeline.record({ epoch, loss: 1 });
    expect(startReplay(timeline, window)).toBe(true);
    const epochs = [timeline.current()?.epoch];
    while (advanceReplay(timeline, window, 1)) epochs.push(timeline.current()?.epoch);
    epochs.push(timeline.current()?.epoch);
    expect(epochs[0]).toBe(3); // epoch 2 has dropped off; the oldest kept frame stands in
    expect(epochs.at(-1)).toBe(4);
  });

  it("clamps the window to what is recorded", () => {
    const timeline = new Timeline<TimelineFrame>();
    for (let epoch = 0; epoch < 4; epoch += 1) timeline.record({ epoch, loss: 1 });
    const window = replayWindow(timeline, 1, flyOff.replay)!;
    expect(window).toEqual({ fromEpoch: 0, atEpoch: 1, after: 5, run: 0 });
    expect(startReplay(timeline, window)).toBe(true);
    while (advanceReplay(timeline, window, 1));
    expect(timeline.getState().cursor).toBe(3);
    expect(replayWindow(new Timeline<TimelineFrame>(), -1, flyOff.replay)).toBeNull();
  });

  it("will not replay a window from an earlier run (PLT-06)", () => {
    const timeline = new Timeline<TimelineFrame>();
    for (let epoch = 0; epoch < 10; epoch += 1) timeline.record({ epoch, loss: 1 });
    const window = replayWindow(timeline, 9, flyOff.replay)!;
    timeline.newRun();
    for (let epoch = 0; epoch < 10; epoch += 1) timeline.record({ epoch, loss: 2 });
    expect(canReplay(timeline, window)).toBe(false);
    expect(startReplay(timeline, window)).toBe(false);
  });

  it("has nothing to replay for a mission that fired on the first moment (PLT-25)", () => {
    const timeline = new Timeline<TimelineFrame>();
    timeline.record({ epoch: 0, loss: 1 });
    expect(canReplay(timeline, replayWindow(timeline, 0, { before: 5, after: 0 })!)).toBe(false);
  });

  it("checks the other missions when one predicate throws (PLT-04)", () => {
    const broken: Mission<State> = {
      ...flyOff,
      id: "broken",
      when: () => {
        throw new Error("bad predicate");
      },
    };
    expect(createMissionWatcher([broken, flyOff])({ step: 0.9 }, undefined)).toEqual([flyOff]);
  });

  it("never hands back a mission already met when primed (PLT-08)", () => {
    const check = createMissionWatcher([flyOff]);
    check.prime({ step: 0.9 }, undefined);
    expect(check({ step: 0.95 }, undefined)).toEqual([]);
  });
});
