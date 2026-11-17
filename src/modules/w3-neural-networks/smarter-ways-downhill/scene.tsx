"use client";

import { useMemo, useSyncExternalStore } from "react";
import { startsFor, WALKERS, type Spot } from "@/features/building/race/race";
import { RaceView } from "@/features/building/race/RaceView";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { isFinished, keyOf, race, result, type SmarterFrame, type SmarterState } from "./model";

type Props = ModuleViewProps<SmarterState, SmarterFrame>;

const round = (value: number) => Math.round(value * 1000) / 1000;

/** The race's outcome in words, once the race on screen has ended. */
export function resultSentence(state: SmarterState, frame: SmarterFrame | undefined): string {
  if (state.runs === 0) return words.result.waiting;
  if (!isFinished(state, frame)) return words.result.racing;
  const outcome = result(state.valley, frame);
  return outcome.level
    ? words.result.level
    : words.result.winner(words.names[outcome.lowest], words.names[outcome.last]);
}

/** The valley with the three walkers racing; the last race's end spots as see-through shapes. */
export function SmarterScene(props: Props) {
  const { state, update, timeline, side } = props;
  const main = side === "main";
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: race,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length, hasGhost } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = timeline.at(cursor);
  const walkers = shown?.walkers ?? startsFor(state.start).map((at) => ({ ...at, off: false }));
  // `length` changes whenever a frame is recorded; the frames are read from the timeline.
  const paths = useMemo(() => {
    const frames = timeline.frames().slice(0, Math.min(cursor, length - 1) + 1);
    return WALKERS.map((_, index) => frames.flatMap(({ walkers: at }) => at[index] ?? []));
  }, [timeline, cursor, length]);
  // Ghost runs: where each walker of the last race ended.
  const ghosts = hasGhost ? (timeline.ghostFrames().at(-1)?.walkers ?? []) : [];
  if (failure) throw failure;
  const newest = timeline.at(length - 1);

  return (
    <div className="flex grow flex-col gap-3" data-testid="smarter-ways-downhill">
      <RaceView
        valley={state.valley}
        walkers={walkers}
        paths={paths}
        ghosts={ghosts.map((at) => (at.off ? undefined : at))}
        words={words}
        turning={false}
        onPick={
          main
            ? (at: Spot) =>
                update(({ runs }) => ({
                  start: { x: round(at.x), z: round(at.z) },
                  runs: runs + 1,
                }))
            : undefined
        }
        pickWords={words.dropSpot}
      />
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-16 flex-col gap-1 text-sm">
        <p data-race-result>{resultSentence(state, newest)}</p>
        {main && (
          <p className="text-ink-soft">
            {words.tapHint} {ghosts.length > 0 ? words.ghostNote : ""}
          </p>
        )}
      </div>
    </div>
  );
}
