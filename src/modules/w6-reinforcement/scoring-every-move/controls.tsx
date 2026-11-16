"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import type { ScoringFrame, ScoringState } from "./model";

type Props = ModuleViewProps<ScoringState, ScoringFrame>;

const BRUSHES = (["floor", "wall", "trap", "coin", "goal"] as const).map((value) => ({
  value,
  label: words.brush[value],
}));

const thirds =
  <T,>(low: T, middle: T, high: T) =>
  (value: number) =>
    value > 0.66 ? high : value > 0.25 ? middle : low;

const DIALS = [
  {
    key: "curiosity",
    words: words.curiosity,
    describe: thirds(words.curiosity.never, words.curiosity.sometimes, words.curiosity.often),
  },
  {
    key: "learnRate",
    words: words.learnRate,
    describe: thirds(words.learnRate.slow, words.learnRate.medium, words.learnRate.fast),
  },
  {
    key: "lookAhead",
    words: words.lookAhead,
    describe: thirds(words.lookAhead.now, words.lookAhead.soon, words.lookAhead.later),
  },
  {
    key: "speed",
    words: words.speed,
    describe: thirds(words.speed.walk, words.speed.run, words.speed.blur),
  },
] as const;

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

export function ScoringControls({ state, update }: Props) {
  return (
    <>
      {DIALS.map((dial) => (
        <Dial
          key={dial.key}
          label={dial.words.label}
          value={state[dial.key]}
          onChange={(value) => update({ [dial.key]: value })}
          describe={dial.describe}
        />
      ))}
      <SegmentedControl
        label={words.brush.label}
        options={BRUSHES}
        value={state.brush}
        onChange={(brush) => update({ brush })}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => update(({ playing }) => ({ playing: !playing }))}
          className={`${BUTTON} text-accent`}
        >
          {state.playing ? words.pause : words.play}
        </button>
        <button
          type="button"
          onClick={() => update(({ attempt }) => ({ attempt: attempt + 1, episodes: 0 }))}
          className={BUTTON}
        >
          {words.fresh}
        </button>
      </div>
    </>
  );
}
