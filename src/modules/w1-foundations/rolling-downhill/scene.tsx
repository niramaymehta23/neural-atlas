"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/design/motion";
import {
  guessesAgainst,
  rollDown,
  startsFor,
  STEPS,
  WALKERS,
  type Spot,
} from "@/features/building/race/race";
import { RaceView } from "@/features/building/race/RaceView";
import type { ModuleViewProps } from "@/platform/contract";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { placeMark, shownMarks, type DownhillFrame, type DownhillState } from "./model";

type Props = ModuleViewProps<DownhillState, DownhillFrame>;

/** Dial changes closer together than this are one turn of the dial: one new roll after it (DH-05). */
const SETTLE_MS = 400;

const round = (value: number) => Math.round(value * 1000) / 1000;
const dialsOf = ({ valley, step, keepRolling }: DownhillState) =>
  `${valley}|${step}|${keepRolling}`;

type Mode = "drop" | "guess";
/**
 * Puts a whole run on the timeline at once (so a hidden or throttled tab still finishes it, DH-01)
 * as a new run, so the last one stays as the ghost, then plays it from the start. The run is
 * rebuilt from state, so a shared link replays it. Only a new roll (`runs`) records one; turning
 * a dial after a roll asks for one new roll once the dial rests (DH-05).
 */
function useRecordedRun({ state, update, timeline, side }: Props) {
  const reduced = useReducedMotion();
  const latest = useRef({ state, reduced });
  const rolledWith = useRef<string | null>(null);
  useEffect(() => {
    latest.current = { state, reduced };
  });
  const { runs, valley, step, keepRolling } = state;

  useEffect(() => {
    if (runs === 0) return;
    const { state: now, reduced: still } = latest.current;
    rolledWith.current = dialsOf(now);
    timeline.newRun();
    for (const frame of rollDown(now)) timeline.record(frame);
    // The private compare timeline follows the main one's moment; only the main one plays.
    if (side === "main" && !still) {
      timeline.seek(0);
      timeline.play();
    }
  }, [runs, side, timeline]);

  useEffect(() => {
    if (side !== "main" || runs === 0 || rolledWith.current === null) return;
    if (rolledWith.current === dialsOf({ ...latest.current.state, valley, step, keepRolling }))
      return;
    const timer = setTimeout(
      () => update((now) => ({ runs: now.runs + 1 }), { touch: false }),
      SETTLE_MS,
    );
    return () => clearTimeout(timer);
  }, [valley, step, keepRolling, runs, side, update]);
}

/** The valley in 3D with the three walkers and their soft trails; tap the ground to drop them. */
export function DownhillScene(props: Props) {
  const { state, update, timeline, side } = props;
  useRecordedRun(props);
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const [mode, setMode] = useState<Mode>("drop");
  const [turning, setTurning] = useState(false);
  const shown = timeline.at(cursor);
  const walkers = shown?.walkers ?? startsFor(state.start).map((at) => ({ ...at, off: false }));
  // `length` changes whenever a frame is recorded; the frames are read from the timeline.
  const paths = useMemo(() => {
    const frames = timeline.frames().slice(0, Math.min(cursor, length - 1) + 1);
    return WALKERS.map((_, index) => frames.flatMap(({ walkers: at }) => at[index] ?? []));
  }, [timeline, cursor, length]);

  const marks = shownMarks(state);
  // The guesses are judged only once the roll has played to its end on screen.
  const judged =
    state.marksFor === state.runs && shown?.epoch === STEPS ? guessesAgainst(marks, shown) : [];
  const main = side === "main";
  const pick = (at: Spot) => {
    const spot = { x: round(at.x), z: round(at.z) };
    if (mode === "guess") update((now) => placeMark(now, spot));
    else update(({ runs }) => ({ start: spot, runs: runs + 1 }));
  };
  const nextWalker = WALKERS[marks.length];

  return (
    <div className="flex grow flex-col gap-3">
      {main && (
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedControl
            label={words.tapMode.label}
            showLabel
            options={[
              { value: "drop", label: words.tapMode.drop },
              { value: "guess", label: words.tapMode.guess },
            ]}
            value={mode}
            onChange={setMode}
          />
          <button
            type="button"
            aria-pressed={turning}
            onClick={() => setTurning((on) => !on)}
            className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm aria-pressed:border-2 aria-pressed:border-accent-ink md:min-h-0"
          >
            {words.turn}
          </button>
        </div>
      )}
      <RaceView
        valley={state.valley}
        walkers={walkers}
        paths={paths}
        ghosts={marks}
        notes={WALKERS.map((_, index) => {
          const verdict = judged[index];
          return verdict ? [words.guessed[verdict]] : [];
        })}
        words={words}
        turning={main && turning}
        onPick={main ? pick : undefined}
        pickWords={mode === "guess" ? words.guessSpot : words.dropSpot}
      />
      {main && (
        <p className="text-sm text-ink-soft" aria-live="polite">
          {turning
            ? words.turnHint
            : mode === "guess"
              ? nextWalker
                ? words.nextGuess[nextWalker]
                : words.nextGuess.done
              : words.tapHint}
        </p>
      )}
    </div>
  );
}
