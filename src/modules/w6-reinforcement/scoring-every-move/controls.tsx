"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import {
  foresight,
  movesPerSecond,
  NEVER_CURIOUS,
  TOO_FAST,
  type ScoringFrame,
  type ScoringState,
} from "./model";

type Props = ModuleViewProps<ScoringState, ScoringFrame>;

const BRUSHES = (["floor", "wall", "trap", "coin", "goal"] as const).map((value) => ({
  value,
  label: words.brush[value],
}));

/** The dials' words, in bands that match what the puppy really does at each setting. */
export const dialWords = {
  curiosity: (value: number) =>
    value < NEVER_CURIOUS
      ? words.curiosity.never
      : value < 0.25
        ? words.curiosity.rarely
        : value < 0.6
          ? words.curiosity.sometimes
          : words.curiosity.often,
  learnRate: (value: number) =>
    value < 0.3
      ? words.learnRate.slow
      : value < TOO_FAST
        ? words.learnRate.medium
        : words.learnRate.fast,
  lookAhead: (value: number) =>
    value < 0.3 ? words.lookAhead.now : value < 0.7 ? words.lookAhead.soon : words.lookAhead.later,
  speed: (value: number) => {
    const perSecond = movesPerSecond(value);
    return perSecond < 8
      ? words.speed.walk
      : perSecond < 60
        ? words.speed.trot
        : perSecond < 500
          ? words.speed.run
          : words.speed.blur;
  },
};

const DIALS = [
  { key: "curiosity", words: words.curiosity },
  { key: "learnRate", words: words.learnRate },
  { key: "lookAhead", words: words.lookAhead },
  { key: "speed", words: words.speed },
] as const;

/** Food this many moves away is shown by each dot of the telescope. */
const TELESCOPE_STEPS = [1, 2, 4, 6, 9, 12, 16, 20];
/** A dot this faint or fainter no longer counts as seen. */
const SEEN = 0.2;

/** The discount telescope: how much food further and further away still counts. */
export function Telescope({ lookAhead }: { lookAhead: number }) {
  const weights = TELESCOPE_STEPS.map((steps) => foresight(lookAhead, steps));
  return (
    <svg
      viewBox="0 0 200 28"
      className="h-7 w-full max-w-56 self-center"
      role="img"
      aria-label={`${words.telescope}: ${dialWords.lookAhead(lookAhead)}`}
      data-telescope
      data-seen={weights.filter((weight) => weight > SEEN).length}
    >
      <path d="M2 9 L22 11 L22 17 L2 19 Z" fill="var(--color-ink-soft)" />
      <rect x={22} y={10} width={8} height={8} rx={1.5} fill="var(--color-ink)" />
      {weights.map((weight, index) => (
        <circle
          key={index}
          cx={44 + index * 20}
          cy={14}
          r={3 + 4 * weight}
          fill="var(--color-ink)"
          fillOpacity={0.12 + 0.88 * weight}
        />
      ))}
    </svg>
  );
}

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

export function ScoringControls({ state, update }: Props) {
  return (
    <>
      {DIALS.map((dial) => (
        <div key={dial.key} className="flex flex-col gap-1">
          <Dial
            label={dial.words.label}
            value={state[dial.key]}
            onChange={(value) => update({ [dial.key]: value })}
            describe={dialWords[dial.key]}
          />
          {dial.key === "lookAhead" && <Telescope lookAhead={state.lookAhead} />}
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <SegmentedControl
          label={words.brush.label}
          options={BRUSHES}
          value={state.brush}
          onChange={(brush) => update({ brush })}
        />
        <p className="text-sm text-ink-soft">{words.treats}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => update(({ playing }) => ({ playing: !playing }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {state.playing ? words.pause : words.play}
        </button>
        <button
          type="button"
          onClick={() =>
            update(({ attempt }) => ({ attempt: attempt + 1, moves: 0, episodes: 0, log: [] }))
          }
          className={BUTTON}
        >
          {words.fresh}
        </button>
      </div>
    </>
  );
}
