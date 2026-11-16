import type { Timeline } from "@/engine/timeline/timeline";
import type { Mission, ModuleState, TimelineFrame } from "../contract";

/**
 * Returns a checker that hands back each mission the first time its predicate holds, and never
 * again. `done` holds missions finished earlier (saved progress), which never fire.
 */
export function createMissionWatcher<S extends ModuleState, F extends TimelineFrame>(
  missions: readonly Mission<S, F>[],
) {
  const fired = new Set<string>();
  return (state: S, frame: F | undefined, done: ReadonlySet<string> = new Set()) =>
    missions.filter((mission) => {
      if (fired.has(mission.id) || done.has(mission.id) || !mission.when(state, frame))
        return false;
      fired.add(mission.id);
      return true;
    });
}

/**
 * The recorded moments a mission's replay covers, kept as epochs so the window stays put while
 * the timeline drops its oldest frames: from `before` moments before the one it fired on, to
 * `after` moments after it.
 */
export type ReplayWindow = { fromEpoch: number; atEpoch: number; after: number };

/** The window around moment `at` (an index into the timeline), or null with nothing recorded. */
export function replayWindow(
  timeline: Timeline<TimelineFrame>,
  at: number,
  { before, after }: Mission<ModuleState>["replay"],
): ReplayWindow | null {
  const fired = timeline.at(at);
  const start = timeline.at(Math.max(0, at - before));
  return fired && start ? { fromEpoch: start.epoch, atEpoch: fired.epoch, after } : null;
}

/** The window as timeline indices today, clamped to what is recorded. */
function indices(timeline: Timeline<TimelineFrame>, window: ReplayWindow) {
  const frames = timeline.frames();
  const indexOf = (epoch: number) =>
    Math.max(
      0,
      frames.findIndex((frame) => frame.epoch >= epoch),
    );
  return {
    from: indexOf(window.fromEpoch),
    to: Math.min(indexOf(window.atEpoch) + window.after, frames.length - 1),
  };
}

/** Jumps to the window's start and plays. Returns false when there is nothing to play. */
export function startReplay(timeline: Timeline<TimelineFrame>, window: ReplayWindow): boolean {
  const { from, to } = indices(timeline, window);
  if (to <= from) return false;
  timeline.seek(from);
  timeline.play();
  return true;
}

/** Advances a replay by `seconds`; stops on the window's end. Returns true while it plays. */
export function advanceReplay(
  timeline: Timeline<TimelineFrame>,
  window: ReplayWindow,
  seconds: number,
): boolean {
  timeline.tick(seconds);
  const { to } = indices(timeline, window);
  if (timeline.getState().cursor < to && timeline.getState().playing) return true;
  timeline.seek(to);
  return false;
}
