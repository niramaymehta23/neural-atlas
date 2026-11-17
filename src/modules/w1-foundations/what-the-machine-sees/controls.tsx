"use client";

import type { ModuleViewProps, TimelineFrame } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import type { SeesState } from "./model";

const describeHouses = (value: number) =>
  value > 0.66 ? words.houses.lots : value > 0.2 ? words.houses.some : words.houses.few;
const describeJumpy = (value: number) =>
  value > 0.6 ? words.jumpy.lots : value > 0.2 ? words.jumpy.some : words.jumpy.steady;

export function SeesControls({ state, update }: ModuleViewProps<SeesState, TimelineFrame>) {
  return (
    <>
      <Dial
        label={words.houses.label}
        value={state.houses}
        onChange={(houses) => update({ houses })}
        describe={describeHouses}
      />
      <Dial
        label={words.jumpy.label}
        value={state.jumpy}
        onChange={(jumpy) => update({ jumpy })}
        describe={describeJumpy}
      />
    </>
  );
}
