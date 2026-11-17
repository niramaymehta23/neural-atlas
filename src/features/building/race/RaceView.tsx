"use client";

import { useRef } from "react";
import { classMark, markPath } from "@/design/encodings";
import { LossLandscape } from "@/scene3d/LossLandscape";
import { HoverNote } from "@/ui/HoverNote";
import { HEIGHTS, WALKERS, type Spot, type Valley, type Walker, type WalkerAt } from "./race";
import { RIM_TONE, WALKER_TONES } from "./tones";

/** The words the race speaks; each lesson passes them from its captions. */
export type RaceWords = {
  /** What the valley is, for screen readers. */
  scene: string;
  walkers: Record<Walker, string>;
  walkerNotes: Record<Walker, string>;
  /** Why each walker left the map, shown beside it in the key. */
  flewOff: Record<Walker, string>;
};

/** Words for choosing a spot on the valley from the keyboard. */
export type PickWords = { label: string; instructions: string };

/**
 * Each walker also has its own shape and trail dash (ground units), shown in the legend too,
 * so they are told apart without colour (A11Y-20).
 */
export const WALKER_SHAPES = WALKERS.map((_, index) => classMark(index));
const WALKER_DASHES: readonly (readonly [number, number] | undefined)[] = [
  undefined,
  [0.06, 0.04],
  [0.015, 0.03],
];
/** The legend draws a trail 24 px long for 0.3 ground units. */
const LEGEND_SCALE = 80;
/** High enough to see the whole valley floor and its rim (DH-08). */
const CAMERA = { position: [0, 1.95, 2.2], target: [0, 0.36, 0.1] } as const;

export const walkerTone = (index: number) => WALKER_TONES[index] ?? RIM_TONE;

type RaceViewProps = {
  valley: Valley;
  /** Where each walker is on the moment shown. */
  walkers: readonly WalkerAt[];
  /** Each walker's path so far, one list of spots per walker. */
  paths: readonly (readonly Spot[])[];
  /** See-through markers per walker (guesses, or where the last run ended). */
  ghosts?: readonly (Spot | undefined)[];
  /** Extra words beside each walker in the key. */
  notes?: readonly (readonly string[])[];
  words: RaceWords;
  /** Turning the valley by dragging, instead of tapping it. */
  turning: boolean;
  onPick?: (at: Spot) => void;
  pickWords: PickWords;
};

/**
 * The valley in 3D with the three walkers, their soft trails and a key that names each one with
 * its shape and dash. Tap the ground to pick a spot, or turn it while `turning`.
 */
export function RaceView({
  valley,
  walkers,
  paths,
  ghosts = [],
  notes = [],
  words,
  turning,
  onPick,
  pickWords,
}: RaceViewProps) {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={stage} data-valley-stage data-turning={turning || undefined}>
        <LossLandscape
          height={HEIGHTS[valley]}
          label={words.scene}
          className="aspect-[4/3] max-h-96 w-full"
          camera={CAMERA}
          rim={RIM_TONE}
          markers={walkers.flatMap((at, index) =>
            at.off ? [] : [{ ...at, tone: walkerTone(index), shape: WALKER_SHAPES[index] }],
          )}
          ghosts={ghosts.flatMap((at, index) =>
            at ? [{ ...at, tone: walkerTone(index), shape: WALKER_SHAPES[index] }] : [],
          )}
          trails={WALKERS.map((_, index) => ({
            points: [...(paths[index] ?? [])],
            tone: walkerTone(index),
            dash: WALKER_DASHES[index],
          }))}
          orbit={turning}
          onTurn={(azimuth) => {
            if (stage.current) stage.current.dataset.azimuth = azimuth.toFixed(3);
          }}
          onPick={turning ? undefined : onPick}
          pickWords={pickWords}
        />
      </div>
      <ul className="flex flex-col gap-y-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
        {WALKERS.map((walker, index) => {
          const said = [
            walkers[index]?.off ? words.flewOff[walker] : null,
            ...(notes[index] ?? []),
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
                    {said.map((note) => (
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
    </>
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
        stroke={walkerTone(index)}
        strokeWidth={2}
        strokeDasharray={dash?.map((part) => part * LEGEND_SCALE).join(" ")}
      />
      <path
        d={markPath(WALKER_SHAPES[index] ?? "circle", 32, 8, 5)}
        fill={walkerTone(index)}
        stroke="var(--color-ink)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
