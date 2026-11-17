"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { classMark, markPath } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import type { ModuleViewProps } from "@/platform/contract";
import { LossLandscape } from "@/scene3d/LossLandscape";
import { HoverNote } from "@/ui/HoverNote";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import {
  guessesAgainst,
  HEIGHTS,
  placeMark,
  rollDown,
  shownMarks,
  startsFor,
  STEPS,
  WALKERS,
  type DownhillFrame,
  type DownhillState,
  type Spot,
} from "./model";
import { RIM_TONE, WALKER_TONES } from "./tones";

type Props = ModuleViewProps<DownhillState, DownhillFrame>;

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
/** Dial changes closer together than this are one turn of the dial: one new roll after it (DH-05). */
const SETTLE_MS = 400;
/** High enough to see the whole valley floor and its rim (DH-08). */
const CAMERA = { position: [0, 1.95, 2.2], target: [0, 0.36, 0.1] } as const;

const tone = (index: number) => WALKER_TONES[index] ?? RIM_TONE;
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
  const stage = useRef<HTMLDivElement>(null);
  const height = HEIGHTS[state.valley];
  const shown = timeline.at(cursor);
  const walkers = shown?.walkers ?? startsFor(state.start).map((at) => ({ ...at, off: false }));
  const trails = useMemo(() => {
    const frames = timeline.frames().slice(0, cursor + 1);
    return WALKERS.map((_, index) => ({
      points: frames.flatMap(({ walkers: at }) => at[index] ?? []),
      tone: tone(index),
      dash: WALKER_DASHES[index],
    }));
    // `length` changes whenever a frame is recorded; the frames are read from the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div ref={stage} data-valley-stage data-turning={turning || undefined}>
        <LossLandscape
          height={height}
          label={words.scene}
          className="aspect-[4/3] max-h-96 w-full"
          camera={CAMERA}
          rim={RIM_TONE}
          markers={walkers.flatMap((at, index) =>
            at.off ? [] : [{ ...at, tone: tone(index), shape: WALKER_SHAPES[index] }],
          )}
          ghosts={marks.map((at, index) => ({
            ...at,
            tone: tone(index),
            shape: WALKER_SHAPES[index],
          }))}
          trails={trails}
          orbit={main && turning}
          onTurn={(azimuth) => {
            if (stage.current) stage.current.dataset.azimuth = azimuth.toFixed(3);
          }}
          onPick={main && !turning ? pick : undefined}
          pickWords={mode === "guess" ? words.guessSpot : words.dropSpot}
        />
      </div>
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
      <ul className="flex flex-col gap-y-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
        {WALKERS.map((walker, index) => {
          const notes = [
            walkers[index]?.off ? words.flewOff[walker] : null,
            judged[index] ? words.guessed[judged[index]] : null,
          ].filter(Boolean);
          return (
            <li key={walker}>
              <HoverNote note={words.walkerNotes[walker]}>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 text-left md:min-h-0"
                  data-walker={walker}
                >
                  <WalkerKey index={index} />
                  <span>
                    {words.walkers[walker]}
                    {notes.map((note) => (
                      <span key={note} className="text-ink-soft">
                        {" "}
                        · {note}
                      </span>
                    ))}
                  </span>
                </button>
              </HoverNote>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A walker's legend key: its trail dash and its shape, in its tone. On the page (not the ground)
 * the outline is the page's ink, so the dark walker shows at night and the light one by day.
 */
function WalkerKey({ index }: { index: number }) {
  const dash = WALKER_DASHES[index];
  return (
    <svg
      viewBox="0 0 40 16"
      className="h-4 w-10 shrink-0"
      aria-hidden
      data-walker-key={WALKER_SHAPES[index]}
    >
      <line x1={2} y1={8} x2={26} y2={8} stroke="var(--color-ink)" strokeWidth={4} />
      <line
        x1={2}
        y1={8}
        x2={26}
        y2={8}
        stroke={tone(index)}
        strokeWidth={2}
        strokeDasharray={dash?.map((part) => part * LEGEND_SCALE).join(" ")}
      />
      <path
        d={markPath(WALKER_SHAPES[index] ?? "circle", 32, 8, 5)}
        fill={tone(index)}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
