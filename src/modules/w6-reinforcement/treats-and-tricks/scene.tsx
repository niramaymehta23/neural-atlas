"use client";

import { useMemo, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { useSpring } from "@/design/motion";
import type { ModuleViewProps } from "@/platform/contract";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import {
  framesOf,
  MOST_ROUNDS,
  RULES,
  SIT,
  trainerTreats,
  TRAINER_ROUNDS,
  TRICKS,
  type Rule,
  type TreatsFrame,
  type TreatsState,
} from "./model";
import { Puppy } from "./Puppy";
import { TrickCard } from "./TrickCard";
import { useRunFrames } from "./use-run-frames";

type Props = ModuleViewProps<TreatsState, TreatsFrame>;

const BIG_BUTTON =
  "min-h-14 flex-1 rounded-card border-2 border-ink px-4 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

const trickName = (trick: number) => words.tricks[TRICKS[trick] ?? "sit"];

/** The training mat: the puppy doing this round's trick, the two treat buttons and the trick cards. */
export function TreatsScene({ state, update, timeline, side }: Props) {
  // The run depends on these alone (not on the trainer's rule).
  const { treats, big, playful, log, puppy } = state;
  const frames = useMemo(
    () => framesOf({ treats, big, playful, log, puppy }),
    [treats, big, playful, log, puppy],
  );
  useRunFrames(timeline, frames);
  const { cursor, live } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const newest = frames.at(-1);
  const scrubbed = timeline.at(cursor);
  // A scrubbed view shows that round; otherwise the round it is on now.
  const frame = !live && scrubbed?.key === newest?.key ? scrubbed : newest;
  const transition = useSpring("settle");
  const editable = side === "main";
  const full = state.treats.length >= MOST_ROUNDS;
  if (!frame) return null;
  const trick = TRICKS[frame.trick] ?? "sit";

  const give = (treat: 0 | 1) => {
    timeline.goLive();
    update(({ treats }) => ({ treats: [...treats, treat].slice(0, MOST_ROUNDS) }));
  };
  const lastLine = frame.last
    ? (frame.last.treat ? words.last.treat : words.last.noTreat)(trickName(frame.last.trick))
    : words.last.none;

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="treats-and-tricks"
      data-round={frame.epoch}
      data-trick={trick}
    >
      <section
        aria-label={words.mat}
        className="flex flex-col gap-3 rounded-card border border-hairline bg-inset p-3"
      >
        <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-hairline bg-card p-3 sm:flex-row sm:items-stretch">
          <div className="flex w-full max-w-56 flex-col items-center gap-1">
            <p className="self-start rounded-pill border border-ink px-3 py-0.5 text-sm font-semibold">
              {words.want}
            </p>
            <svg viewBox="0 0 100 80" className="h-auto w-full max-w-48" aria-hidden>
              <motion.g
                key={`${frame.key}-${frame.epoch}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transition}
              >
                <Puppy trick={trick} />
              </motion.g>
            </svg>
            <p className="text-base font-semibold" data-doing>
              {words.doing(trickName(frame.trick))}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col justify-center gap-3">
            {editable && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={full}
                  onClick={() => give(1)}
                  className={`${BIG_BUTTON} bg-accent text-on-accent`}
                  data-give="treat"
                >
                  {words.treat}
                </button>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => give(0)}
                  className={`${BIG_BUTTON} bg-paper text-ink`}
                  data-give="none"
                >
                  {words.noTreat}
                </button>
              </div>
            )}
            {/* Reserved lines, so nothing jumps as the words change. */}
            <p className="min-h-10 text-sm" data-last>
              {lastLine}
            </p>
            <p className="min-h-5 text-sm text-ink-soft">
              {full ? words.full : words.rounds(frame.epoch)}
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-shares={frame.shares.join(",")}>
          {TRICKS.map((name, index) => (
            <TrickCard
              key={name}
              trick={name}
              share={frame.shares[index] ?? 0}
              doing={index === frame.trick}
              wanted={index === SIT}
            />
          ))}
        </ul>
      </section>
      {editable && (
        <section className="flex flex-col gap-2 text-sm">
          <SegmentedControl<Rule>
            label={words.trainer.label}
            showLabel
            vertical={false}
            options={RULES.map((rule) => ({ value: rule, label: words.trainer.rules[rule] }))}
            value={state.rule}
            onChange={(rule) => update({ rule })}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BUTTON}
              disabled={full}
              onClick={() => {
                timeline.goLive();
                update((now) => ({ treats: trainerTreats(now, now.rule) }));
              }}
            >
              {words.trainer.play(TRAINER_ROUNDS)}
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={state.treats.length === 0 && state.log.length === 0}
              onClick={() => {
                timeline.goLive();
                update(({ puppy }) => ({ treats: [], log: [], puppy: puppy + 1 }));
              }}
            >
              {words.fresh}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
