"use client";

import { count } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { words } from "./captions";
import { ROUNDS, type FriendsState } from "./model";

const describeListen = (value: number) =>
  value === 0
    ? words.listen.none
    : value < 0.4
      ? words.listen.little
      : value < 1
        ? words.listen.lot
        : words.listen.only;

const describeRounds = (value: number) =>
  value === 0
    ? words.rounds.none
    : value === 1
      ? words.rounds.one
      : words.rounds.many(count(value));

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

export function FriendsControls({ state, update }: ModuleViewProps<FriendsState>) {
  return (
    <>
      <Dial
        label={words.listen.label}
        value={state.listen}
        onChange={(listen) => update({ listen })}
        describe={describeListen}
      />
      <Dial
        label={words.rounds.label}
        value={state.rounds}
        min={ROUNDS.min}
        max={ROUNDS.max}
        step={1}
        onChange={(rounds) => update({ rounds })}
        describe={describeRounds}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={state.rounds >= ROUNDS.max}
          onClick={() => update(({ rounds }) => ({ rounds: Math.min(ROUNDS.max, rounds + 1) }))}
          className={BUTTON}
        >
          {words.pass}
        </button>
        <button
          type="button"
          disabled={state.rounds === 0}
          onClick={() => update({ rounds: 0 })}
          className={BUTTON}
        >
          {words.restart}
        </button>
      </div>
    </>
  );
}
