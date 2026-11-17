"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LIMITS, type QuestionsState } from "./model";

type Props = ModuleViewProps<QuestionsState>;

const describeDepth = (value: number) =>
  value === 0 ? words.depth.none : value === 1 ? words.depth.one : words.depth.many(count(value));
const describeSmallest = (value: number) =>
  value === 1 ? words.smallest.one : words.smallest.many(count(value));

export function QuestionsControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.depth.label}
        value={state.depth}
        min={LIMITS.depth.min}
        max={LIMITS.depth.max}
        step={1}
        onChange={(depth) => update({ depth })}
        describe={describeDepth}
      />
      <Dial
        label={words.smallest.label}
        value={state.smallest}
        min={LIMITS.smallest.min}
        max={LIMITS.smallest.max}
        step={1}
        onChange={(smallest) => update({ smallest })}
        describe={describeSmallest}
      />
    </>
  );
}
