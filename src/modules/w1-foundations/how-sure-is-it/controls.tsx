"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { SureState } from "./model";

const describeBoast = (value: number) =>
  value > 0.8
    ? words.boast.boastful
    : value > 0.55
      ? words.boast.bold
      : value > 0.25
        ? words.boast.fair
        : words.boast.cautious;
const describeOverlap = (value: number) =>
  value > 0.66 ? words.overlap.lots : value > 0.25 ? words.overlap.some : words.overlap.apart;

export function SureControls({ state, update }: ModuleViewProps<SureState>) {
  return (
    <>
      <Dial
        label={words.boast.label}
        value={state.boast}
        onChange={(boast) => update({ boast })}
        describe={describeBoast}
      />
      <Dial
        label={words.overlap.label}
        value={state.overlap}
        onChange={(overlap) => update({ overlap })}
        describe={describeOverlap}
      />
    </>
  );
}
