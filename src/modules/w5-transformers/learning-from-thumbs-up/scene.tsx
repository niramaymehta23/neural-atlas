"use client";

import { useMemo } from "react";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { CHECKS, PRACTICE, words } from "./captions";
import { frameOf, judgePick, MOST_PICKS, PAIRS, type ThumbsFrame, type ThumbsState } from "./model";

type Props = ModuleViewProps<ThumbsState, ThumbsFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink disabled:opacity-40 md:min-h-0";
const FEATURES = ["correct", "flatters", "agrees"] as const;
/** Weights are drawn up to this size either way. */
const MOST_WEIGHT = 3;

/** The pair to judge, what the reward model has learned, and how the chatbot now answers. */
export function ThumbsScene({ state, update, timeline, side }: Props) {
  const frame = useMemo(() => frameOf(state), [state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const round = state.picks.length;
  const pair = PAIRS[round];
  const question = pair ? PRACTICE[pair.question] : undefined;
  const pick = (choice: number) =>
    update(({ picks }) => ({ picks: [...picks, choice].slice(0, MOST_PICKS) }));

  return (
    <div className="flex grow flex-col gap-4" data-testid="learning-from-thumbs-up">
      {editable && (
        <section className="flex min-h-64 flex-col gap-2" data-round={round}>
          {pair && question ? (
            <>
              <p className="text-sm text-ink-soft">{words.round(round + 1, MOST_PICKS)}</p>
              <p className="font-semibold">{words.question(question.ask)}</p>
              <p className="text-sm text-ink-soft">{words.pick}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[pair.first, pair.second].map((answer, side) => {
                  const text = question.answers[answer]?.text ?? "";
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-label={words.pickLabel(text)}
                      data-choice={side}
                      onClick={() => pick(side)}
                      className="min-h-20 rounded-card border border-hairline bg-card p-3 text-left text-sm hover:border-ink"
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm">{words.done}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BUTTON}
              disabled={round >= MOST_PICKS}
              onClick={() =>
                update(({ picks }) => ({
                  picks: [
                    ...picks,
                    ...Array.from({ length: 10 }, (_, at) => judgePick(picks.length + at)),
                  ].slice(0, MOST_PICKS),
                }))
              }
            >
              {words.judge}
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={round === 0}
              onClick={() => update(({ picks }) => ({ picks: picks.slice(0, -1) }))}
            >
              {words.undo}
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={round === 0}
              onClick={() => update({ picks: [] })}
            >
              {words.again}
            </button>
          </div>
        </section>
      )}
      <section className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">{words.learned}</p>
        <ul className="flex flex-col gap-1" data-weights>
          {FEATURES.map((feature) => {
            const value = frame.weights[feature];
            const share = Math.min(1, Math.abs(value) / MOST_WEIGHT) * 50;
            return (
              <li
                key={feature}
                data-feature={feature}
                data-weight={value.toFixed(2)}
                className="grid min-h-7 grid-cols-[minmax(0,9rem)_minmax(3rem,1fr)_minmax(0,8rem)] items-center gap-2"
              >
                <span>{words.likes[feature]}</span>
                <span aria-hidden className="relative h-4 rounded-pill bg-inset">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-ink-soft" />
                  <span
                    className={`absolute inset-y-0 rounded-pill ${value >= 0 ? "bg-flow" : "border border-ink bg-paper"}`}
                    style={
                      value >= 0
                        ? { left: "50%", width: `${share}%` }
                        : { right: "50%", width: `${share}%` }
                    }
                  />
                </span>
                <span className="text-xs text-ink-soft">{words.weight(value)}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="flex flex-col gap-2 text-sm" data-yes-man={frame.yesMan ? "" : undefined}>
        <p className="font-semibold">{words.checks}</p>
        <ul className="flex flex-col gap-2">
          {CHECKS.map((check, at) => {
            const given = check.answers[frame.answers[at] ?? 0];
            return (
              <li key={check.ask} className="rounded-card border border-hairline bg-paper p-3">
                <p className="text-ink-soft">{words.question(check.ask)}</p>
                <p>
                  {given?.text}{" "}
                  <span
                    className={`rounded-pill border px-2 text-xs ${given?.correct ? "border-ink" : "border-dashed border-ink"}`}
                  >
                    {given?.correct ? words.right : words.wrong}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="min-h-5 font-semibold">{frame.yesMan ? words.yesMan : words.honest}</p>
      </section>
    </div>
  );
}
