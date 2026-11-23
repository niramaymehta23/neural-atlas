"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { PRIZE, RIGHT_NOW, type NowFrame, type NowState } from "./model";

type Props = ModuleViewProps<NowState, NowFrame>;

/** The dials' words; "right now" is the band where the guess is told. */
export const dialWords = {
  care: (value: number) =>
    value <= 0
      ? words.care.second
      : value < RIGHT_NOW
        ? words.care.now
        : value < 0.75
          ? words.care.soon
          : words.care.later,
  prize: (value: number) =>
    value < 1.5
      ? words.prize.same
      : value < 3
        ? words.prize.bigger
        : value < 6
          ? words.prize.much
          : words.prize.feast,
};

export function NowControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.care.label}
        value={state.care}
        onChange={(care) => update({ care })}
        describe={dialWords.care}
      />
      <Dial
        label={words.prize.label}
        value={state.prize}
        min={PRIZE.min}
        max={PRIZE.max}
        step={0.5}
        onChange={(prize) => update({ prize })}
        describe={dialWords.prize}
      />
    </>
  );
}
