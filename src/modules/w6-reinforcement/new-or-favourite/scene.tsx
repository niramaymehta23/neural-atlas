"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  keyOf,
  MACHINES,
  NEVER,
  raceRun,
  yourResults,
  YOUR_PULLS,
  type CasinoState,
  type RaceFrame,
} from "./model";
import { RaceView } from "./RaceView";
import { SlotMachine } from "./SlotMachine";

type Props = ModuleViewProps<CasinoState, RaceFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

/** Your five machines and your coins, then the bots' race on the same machines. */
export function CasinoScene(props: Props) {
  const { state, update, timeline, side } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.races,
    work: raceRun,
    settings: keyOf(state),
    rerun: () => update(({ races }) => ({ races: races + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.races > 0 ? timeline.at(cursor) : undefined;
  const race = shown && shown.key === keyOf(state) ? shown : undefined;
  const { pulls, plays } = state;
  const results = useMemo(() => yourResults({ pulls, plays }), [pulls, plays]);
  if (failure) throw failure;

  const editable = side === "main";
  const wins = results.filter(({ won }) => won).length;
  const last = results.at(-1);
  const left = YOUR_PULLS - results.length;
  const pull = (machine: number) =>
    update((now) => (now.pulls.length >= YOUR_PULLS ? {} : { pulls: [...now.pulls, machine] }));

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="new-or-favourite"
      data-pulls={results.length}
      data-coins={wins}
    >
      {/* The other half of a comparison keeps the space, so both races line up. */}
      <section
        aria-label={words.casino}
        className={`flex flex-col gap-3 rounded-card border border-hairline bg-inset p-3 ${editable ? "" : "invisible"}`}
        inert={!editable}
      >
        <ul className="grid grid-cols-5 gap-1 sm:gap-3">
          {MACHINES.map((machine, index) => {
            const mine = results.filter((result) => result.machine === index);
            const mineWins = mine.filter(({ won }) => won).length;
            const name = words.machines[machine];
            const shows = last?.machine === index ? (last.won ? "won" : "lost") : null;
            return (
              <li key={machine} className="flex min-w-0 flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={left <= 0}
                  onClick={() => pull(index)}
                  aria-label={words.pull(name, words.record(mineWins, mine.length))}
                  data-machine={machine}
                  className="w-full rounded-card p-0.5 hover:bg-card disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 62 80" className="h-auto w-full" aria-hidden>
                    <SlotMachine machine={machine} shows={shows} />
                  </svg>
                </button>
                <span className="text-xs font-medium" aria-hidden>
                  {name}
                </span>
                {/* Reserved: room for every pull of a game, so nothing below jumps. */}
                <span
                  className="flex min-h-14 w-full flex-wrap content-start justify-center gap-0.5"
                  aria-hidden
                >
                  {mine.map(({ won }, at) => (
                    // A coin for a win, a dash for nothing: told apart by shape.
                    <svg
                      key={at}
                      viewBox="0 0 10 10"
                      className="size-2.5"
                      data-token={won ? "won" : "lost"}
                    >
                      {won ? (
                        <>
                          <circle
                            cx={5}
                            cy={5}
                            r={4}
                            fill="var(--color-sand)"
                            stroke="var(--color-ink)"
                          />
                          <circle cx={5} cy={5} r={1.8} fill="none" stroke="var(--color-ink)" />
                        </>
                      ) : (
                        <path
                          d="M2 5H8"
                          stroke="var(--color-ink-soft)"
                          strokeWidth={1.6}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex min-h-16 flex-col gap-1 text-sm" data-your-play>
          <p className="font-semibold">
            {last
              ? (last.won ? words.lastPull.won : words.lastPull.lost)(
                  words.machines[MACHINES[last.machine] ?? "star"],
                )
              : words.lastPull.none}
          </p>
          <p>{left > 0 ? words.left(left, wins) : words.done(wins)}</p>
        </div>
        <div>
          <button
            type="button"
            className={BUTTON}
            disabled={results.length === 0}
            onClick={() => update(({ plays: games }) => ({ pulls: [], plays: games + 1 }))}
          >
            {words.again}
          </button>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-serif text-lg">{words.race.title}</h3>
        {race ? (
          <RaceView frame={race} never={state.curious < NEVER} />
        ) : (
          <p className="min-h-10 text-sm">{words.race.waiting}</p>
        )}
      </section>
    </div>
  );
}
