"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { RoadState } from "./model";

type Props = ModuleViewProps<RoadState>;

const describeStrict = (value: number) =>
  value < 0.34 ? words.strict.loose : value < 0.67 ? words.strict.middle : words.strict.strict;

export function RoadControls({ state, update }: Props) {
  const describeLift = (value: number) =>
    state.ground === "flat" ? words.lift.flat : value < 0.5 ? words.lift.low : words.lift.high;
  return (
    <>
      <Dial
        label={words.strict.label}
        value={state.strict}
        onChange={(strict) => update({ strict })}
        describe={describeStrict}
      />
      <Dial
        label={words.lift.label}
        value={state.lift}
        onChange={(lift) => update({ lift })}
        describe={describeLift}
      />
    </>
  );
}
