"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import {
  LIMITS,
  MOST_MOVES,
  PILES,
  settled,
  type GroupsFrame,
  type GroupsState,
  type Piles,
} from "./model";

type Props = ModuleViewProps<GroupsState, GroupsFrame>;

const PILE_OPTIONS = PILES.map((value) => ({ value, label: words.piles[value] }));

const describeMagnets = (value: number) =>
  value === 1 ? words.magnets.one : words.magnets.many(count(value));
const describeSpread = (value: number) =>
  value < 0.3 ? words.spread.tight : value < 0.7 ? words.spread.middle : words.spread.loose;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function GroupsControls({ state, update }: Props) {
  const done = settled(state);
  return (
    <>
      <SegmentedControl
        label={words.piles.label}
        showLabel
        options={PILE_OPTIONS}
        value={state.piles}
        onChange={(piles: Piles) => update({ piles, moves: 0 })}
      />
      <Dial
        label={words.magnets.label}
        value={state.magnets}
        min={LIMITS.magnets.min}
        max={LIMITS.magnets.max}
        step={1}
        onChange={(magnets) => update({ magnets, moves: 0 })}
        describe={describeMagnets}
      />
      <Dial
        label={words.spread.label}
        value={state.spread}
        step={0.05}
        onChange={(spread) => update({ spread, moves: 0 })}
        describe={describeSpread}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={done}
          onClick={() => update(({ moves }) => ({ moves: moves + 1 }))}
          className={`${BUTTON} text-accent-ink`}
        >
          {words.move}
        </button>
        <button
          type="button"
          disabled={done}
          onClick={() => update({ moves: MOST_MOVES })}
          className={BUTTON}
        >
          {words.settle}
        </button>
        <button
          type="button"
          onClick={() =>
            update(({ attempt }) => ({
              attempt: attempt >= LIMITS.attempt.max ? 0 : attempt + 1,
              moves: 0,
            }))
          }
          className={BUTTON}
        >
          {words.again}
        </button>
      </div>
    </>
  );
}
