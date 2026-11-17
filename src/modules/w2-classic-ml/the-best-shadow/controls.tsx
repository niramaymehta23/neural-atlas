"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { bestDials, CLOUDS, type Cloud, type ShadowState } from "./model";

type Props = ModuleViewProps<ShadowState>;

const CLOUD_OPTIONS = CLOUDS.map((value) => ({ value, label: words.clouds[value] }));

const describeTurn = (value: number) => {
  const quarter = Math.round(value * 4) % 4;
  return [words.turn.front, words.turn.right, words.turn.back, words.turn.left][quarter] ?? "";
};
const describeTip = (value: number) =>
  value < 0.15
    ? words.tip.level
    : value < 0.5
      ? words.tip.low
      : value < 0.9
        ? words.tip.high
        : words.tip.top;

export function ShadowControls({ state, update }: Props) {
  return (
    <>
      <SegmentedControl
        label={words.clouds.label}
        showLabel
        options={CLOUD_OPTIONS}
        value={state.cloud}
        onChange={(cloud: Cloud) => update({ cloud })}
      />
      <Dial
        label={words.turn.label}
        value={state.turn}
        onChange={(turn) => update({ turn })}
        describe={describeTurn}
      />
      <Dial
        label={words.tip.label}
        value={state.tip}
        onChange={(tip) => update({ tip })}
        describe={describeTip}
      />
      <button
        type="button"
        onClick={() => update(({ cloud }) => bestDials(cloud))}
        className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0"
      >
        {words.best}
      </button>
    </>
  );
}
