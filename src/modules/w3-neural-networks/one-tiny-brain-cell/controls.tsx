"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { CellFrame, CellState } from "./model";

const describeConvince = (value: number) =>
  value > 0.66 ? words.convince.hard : value > 0.33 ? words.convince.medium : words.convince.easy;
const describeFirmness = (value: number) =>
  value > 0.66 ? words.firmness.firm : value > 0.25 ? words.firmness.medium : words.firmness.soft;

export function CellControls({ state, update }: ModuleViewProps<CellState, CellFrame>) {
  return (
    <>
      <Dial
        label={words.convince.label}
        value={state.convince}
        onChange={(convince) => update(({ changes }) => ({ convince, changes: changes + 1 }))}
        describe={describeConvince}
      />
      <Dial
        label={words.firmness.label}
        value={state.firmness}
        onChange={(firmness) => update(({ changes }) => ({ firmness, changes: changes + 1 }))}
        describe={describeFirmness}
      />
    </>
  );
}
