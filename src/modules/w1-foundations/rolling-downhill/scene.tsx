"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { classTone } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import type { ModuleViewProps } from "@/platform/contract";
import { LossLandscape } from "@/scene3d/LossLandscape";
import { HoverNote } from "@/ui/HoverNote";
import { words } from "./captions";
import { HEIGHTS, rollDown, WALKERS, type DownhillFrame, type DownhillState } from "./model";

type Props = ModuleViewProps<DownhillState, DownhillFrame>;

/** One tone per walker; the steady walker is ink, as the valley floor is already sky. */
const WALKER_TONES = ["var(--color-ink)", classTone(1), classTone(2)];

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Plays a run into the timeline one step per frame (all at once under reduced motion), as a new
 * run so the last one stays as the ghost. The run is rebuilt from state, so a shared link replays it.
 */
function useRecordedRun({ state, timeline }: Pick<Props, "state" | "timeline">) {
  const reduced = useReducedMotion();
  const { valley, step, keepRolling, start, runs } = state;
  useEffect(() => {
    if (runs === 0) return;
    const frames = rollDown({ valley, step, keepRolling, start, runs });
    let next = 0;
    let frame = 0;
    const record = () => {
      if (next === 0) timeline.newRun();
      const until = reduced ? frames.length : next + 1;
      for (; next < until; next += 1) timeline.record(frames[next] as DownhillFrame);
      if (next < frames.length) frame = requestAnimationFrame(record);
    };
    frame = requestAnimationFrame(record);
    return () => cancelAnimationFrame(frame);
  }, [valley, step, keepRolling, start, runs, reduced, timeline]);
}

/** The valley in 3D with the three walkers and their soft trails; tap the ground to drop them. */
export function DownhillScene({ state, update, timeline, side }: Props) {
  useRecordedRun({ state, timeline });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const height = HEIGHTS[state.valley];
  const shown = timeline.at(cursor);
  const walkers = shown?.walkers ?? WALKERS.map(() => ({ ...state.start, off: false }));
  const trails = useMemo(() => {
    const frames = timeline.frames().slice(0, cursor + 1);
    return WALKERS.map((_, index) => ({
      points: frames.flatMap(({ walkers: at }) => at[index] ?? []),
      tone: WALKER_TONES[index] ?? classTone(index),
    }));
    // `length` changes whenever a frame is recorded; the frames are read from the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, cursor, length]);

  return (
    <div className="flex grow flex-col gap-3">
      <LossLandscape
        height={height}
        label={words.scene}
        className="h-80 w-full"
        markers={walkers.flatMap((at, index) =>
          at.off ? [] : [{ ...at, tone: WALKER_TONES[index] ?? classTone(index) }],
        )}
        trails={trails}
        onPick={
          side === "main"
            ? ({ x, z }) =>
                update(({ runs }) => ({ start: { x: round(x), z: round(z) }, runs: runs + 1 }))
            : undefined
        }
      />
      {state.runs === 0 && <p className="text-sm text-ink-soft">{words.tapHint}</p>}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label={words.scene}>
        {WALKERS.map((walker, index) => (
          <li key={walker}>
            <HoverNote note={words.walkerNotes[walker]}>
              <button type="button" className="flex items-center gap-2" data-walker={walker}>
                <span
                  aria-hidden
                  className="size-3 rounded-pill"
                  style={{ background: WALKER_TONES[index] }}
                />
                {words.walkers[walker]}
                {walkers[index]?.off && <span className="text-ink-soft">· {words.flewOff}</span>}
              </button>
            </HoverNote>
          </li>
        ))}
      </ul>
    </div>
  );
}
