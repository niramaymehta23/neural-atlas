"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { LIMITS, type CrowdState } from "./model";

type Props = ModuleViewProps<CrowdState>;

const describeTrees = (value: number) =>
  value === 1 ? words.trees.one : words.trees.many(count(value));
const describeVariety = (value: number) =>
  value < 0.01 ? words.variety.same : value < 0.5 ? words.variety.some : words.variety.lots;

const BUTTON = "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm md:min-h-0";

export function CrowdControls({ state, update }: Props) {
  return (
    <>
      <Dial
        label={words.trees.label}
        value={state.trees}
        min={LIMITS.trees.min}
        max={LIMITS.trees.max}
        step={1}
        onChange={(trees) => update({ trees })}
        describe={describeTrees}
      />
      <Dial
        label={words.variety.label}
        value={state.variety}
        onChange={(variety) => update({ variety })}
        describe={describeVariety}
      />
      <button
        type="button"
        onClick={() => update(({ attempt }) => ({ attempt: attempt + 1 }))}
        className={BUTTON}
      >
        {words.regrow}
      </button>
    </>
  );
}
