"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { classMark, classTone, markPath } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import type { ModuleViewProps } from "@/platform/contract";
import { LossLandscape } from "@/scene3d/LossLandscape";
import { HoverNote } from "@/ui/HoverNote";
import { words } from "./captions";
import { HEIGHTS, rollDown, WALKERS, type DownhillFrame, type DownhillState } from "./model";

type Props = ModuleViewProps<DownhillState, DownhillFrame>;

/** One tone per walker; the steady walker is ink, as the valley floor is already sky. */
const WALKER_TONES = ["var(--color-ink)", classTone(1), classTone(2)];
/**
 * Each walker also has its own shape and trail dash (ground units), shown in the legend too,
 * so they are told apart without colour (A11Y-20).
 */
const WALKER_SHAPES = WALKERS.map((_, index) => classMark(index));
const WALKER_DASHES: readonly (readonly [number, number] | undefined)[] = [
  undefined,
  [0.06, 0.04],
  [0.015, 0.03],
];
/** The legend draws a trail 24 px long for 0.3 ground units. */
const LEGEND_SCALE = 80;

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
      dash: WALKER_DASHES[index],
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
          at.off
            ? []
            : [
                {
                  ...at,
                  tone: WALKER_TONES[index] ?? classTone(index),
                  shape: WALKER_SHAPES[index],
                },
              ],
        )}
        trails={trails}
        onPick={
          side === "main"
            ? ({ x, z }) =>
                update(({ runs }) => ({ start: { x: round(x), z: round(z) }, runs: runs + 1 }))
            : undefined
        }
        pickWords={words.dropSpot}
      />
      {state.runs === 0 && <p className="text-sm text-ink-soft">{words.tapHint}</p>}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label={words.scene}>
        {WALKERS.map((walker, index) => (
          <li key={walker}>
            <HoverNote note={words.walkerNotes[walker]}>
              <button type="button" className="flex items-center gap-2" data-walker={walker}>
                <WalkerKey index={index} />
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

/** A walker's legend key: its trail dash and its shape, in its tone. */
function WalkerKey({ index }: { index: number }) {
  const tone = WALKER_TONES[index] ?? classTone(index);
  const dash = WALKER_DASHES[index];
  return (
    <svg
      viewBox="0 0 40 16"
      className="h-4 w-10"
      aria-hidden
      data-walker-key={WALKER_SHAPES[index]}
    >
      <line
        x1={2}
        y1={8}
        x2={26}
        y2={8}
        stroke={tone}
        strokeWidth={2}
        strokeDasharray={dash?.map((part) => part * LEGEND_SCALE).join(" ")}
      />
      <path
        d={markPath(WALKER_SHAPES[index] ?? "circle", 32, 8, 5)}
        fill={tone}
        stroke="var(--color-ink)"
        strokeWidth={1}
      />
    </svg>
  );
}
