"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { NONE, VERY_SLIPPERY, type BoardFrame, type BoardState } from "./model";

type Props = ModuleViewProps<BoardState, BoardFrame>;

const BRUSHES = (["floor", "wall", "trap", "coin", "goal"] as const).map((value) => ({
  value,
  label: words.brush[value],
}));

/** The dials' words, in bands that match the board: "very slippery" is where the guess is told. */
export const dialWords = {
  slippery: (value: number) =>
    value < NONE
      ? words.slippery.still
      : value < 0.35
        ? words.slippery.little
        : value < VERY_SLIPPERY
          ? words.slippery.some
          : words.slippery.very,
  tiring: (value: number) =>
    value < NONE
      ? words.tiring.free
      : value < 0.3
        ? words.tiring.little
        : value < 0.6
          ? words.tiring.some
          : words.tiring.very,
};

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0";

export function GameBoardControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.slippery.label}
        value={state.slippery}
        onChange={(slippery) => update({ slippery })}
        describe={dialWords.slippery}
      />
      <Dial
        label={words.tiring.label}
        value={state.tiring}
        onChange={(tiring) => update({ tiring })}
        describe={dialWords.tiring}
      />
      <SegmentedControl
        label={words.brush.label}
        options={BRUSHES}
        value={state.brush}
        onChange={(brush) => update({ brush })}
      />
      <button
        type="button"
        onClick={() => update(({ walks }) => ({ walks: walks + 1 }))}
        className={BUTTON}
      >
        {state.walks === 0 ? words.walk.try : words.walk.again}
      </button>
    </>
  );
}
