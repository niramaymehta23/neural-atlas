"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { KEEP, type SqueezeFrame, type SqueezeState } from "./model";

const describeKeep = (value: number) =>
  value === 1 ? words.keep.one : words.keep.many(count(value));

const describeSmudge = (value: number) =>
  value <= 0
    ? words.smudge.none
    : value < 0.35
      ? words.smudge.few
      : value < 0.75
        ? words.smudge.lots
        : words.smudge.covered;

export function SqueezeControls({ state, update }: ModuleViewProps<SqueezeState, SqueezeFrame>) {
  return (
    <>
      <Dial
        label={words.keep.label}
        value={state.keep}
        min={KEEP.min}
        max={KEEP.most}
        step={1}
        onChange={(keep) => update({ keep })}
        describe={describeKeep}
      />
      <Dial
        label={words.smudge.label}
        value={state.smudge}
        step={0.05}
        onChange={(smudge) => update({ smudge: Math.round(smudge * 100) / 100 })}
        describe={describeSmudge}
      />
    </>
  );
}
