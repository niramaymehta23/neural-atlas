"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { inputOf, type ForwardFrame, type ForwardState } from "./model";
import { describeRed, describeRound } from "./scene";

/** Changing the fruit starts the thought afresh: press "Think" to send the new one through. */
export function ForwardControls({ state, update }: ModuleViewProps<ForwardState, ForwardFrame>) {
  return (
    <>
      <Dial
        label={words.round.label}
        value={state.round}
        onChange={(round) => update({ round, shown: 0 })}
        describe={(value) => describeRound(inputOf(value))}
      />
      <Dial
        label={words.red.label}
        value={state.red}
        onChange={(red) => update({ red, shown: 0 })}
        describe={(value) => describeRed(inputOf(value))}
      />
    </>
  );
}
