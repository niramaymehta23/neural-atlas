"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { newestOf } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import {
  CARS,
  COPIES,
  hasWayRound,
  keyOf,
  TRACK_NAMES,
  TRACKS,
  WILD_CHANGE,
  type Brush,
  type RaceFrame,
  type RaceState,
} from "./model";

type Props = ModuleViewProps<RaceState, RaceFrame>;

const BRUSHES: { value: Brush; label: string }[] = [
  { value: "road", label: words.brush.road },
  { value: "grass", label: words.brush.grass },
];

/** The change dial's words, in bands that match what the children really are (WILD_CHANGE is measured). */
export const changeWords = (value: number) =>
  value < COPIES
    ? words.change.copies
    : value < 0.15
      ? words.change.tiny
      : value < 0.5
        ? words.change.small
        : value < WILD_CHANGE
          ? words.change.big
          : words.change.wild;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function RaceControls({ state, update, timeline }: Props) {
  useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const working = state.runs > 0 && newestOf(timeline)?.key !== keyOf(state);
  const blocked = !hasWayRound(state.road);
  const pickTrack = (road: string) => {
    // A new track is the track as it is now, so a scrubbed-back view jumps to now first.
    if (!timeline.getState().live) timeline.goLive();
    update({ road });
  };
  return (
    <>
      <Dial
        label={words.change.label}
        value={state.change}
        onChange={(change) => update({ change })}
        describe={changeWords}
      />
      <Dial
        label={words.carsDial.label}
        value={state.cars}
        min={CARS.min}
        max={CARS.max}
        step={1}
        onChange={(cars) => update({ cars })}
        describe={(value) => words.carsDial.many(count(value))}
      />
      <SegmentedControl
        label={words.brush.label}
        options={BRUSHES}
        value={state.brush}
        onChange={(brush) => update({ brush })}
        showLabel
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-soft">{words.tracks.label}</p>
        <div className="flex flex-wrap gap-2" data-tracks>
          {TRACK_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={state.road === TRACKS[name]}
              onClick={() => pickTrack(TRACKS[name])}
              className={`${BUTTON} aria-pressed:border-ink`}
            >
              {words.tracks[name]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={working || blocked}
          onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.runs === 0 ? words.start : working ? words.working : words.again}
        </button>
        <button
          type="button"
          disabled={working || blocked}
          onClick={() => update(({ runs, attempt }) => ({ runs: runs + 1, attempt: attempt + 1 }))}
          className={BUTTON}
        >
          {words.another}
        </button>
      </div>
    </>
  );
}
