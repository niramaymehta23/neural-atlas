"use client";

import { useMemo } from "react";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  frameOf,
  fullOrder,
  MOST_LETTERS,
  MOST_WORDS,
  moved,
  stampOf,
  wordsOf,
  type OrderFrame,
  type OrderState,
} from "./model";

type Props = ModuleViewProps<OrderState, OrderFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";
const ARROW =
  "grid min-h-11 min-w-11 place-items-center rounded-control border border-hairline bg-paper text-accent-ink disabled:opacity-40 md:min-h-8 md:min-w-8";
const BARS = 8;

/** One place's stamp as small bars above and below a line: the wave pattern for that place. */
function Stamp({ at, strength, speed }: { at: number; strength: number; speed: number }) {
  const stamp = stampOf(at, speed).slice(0, BARS);
  return (
    <svg
      viewBox={`0 0 ${BARS * 6} 24`}
      className="h-6 w-12"
      role="img"
      aria-label={words.stamp(at + 1)}
    >
      <line x1={0} x2={BARS * 6} y1={12} y2={12} className="stroke-hairline" strokeWidth={1} />
      {stamp.map((value, d) => {
        const height = Math.abs(value * strength) * 10;
        return (
          <rect
            key={d}
            x={d * 6 + 1}
            y={value >= 0 ? 12 - height : 12}
            width={4}
            height={Math.max(0.5, height)}
            className="fill-ink-soft"
          />
        );
      })}
    </svg>
  );
}

/** The sentence as typed, the same words in a new order, and how differently the reader sees them. */
export function OrderScene({ state, update, timeline, side }: Props) {
  const frame = useMemo(() => frameOf(state), [state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const typed = wordsOf(state.sentence);
  const order = fullOrder(state.order, typed.length);
  const rows = [
    { key: "typed", label: words.typed, list: typed, movable: false },
    { key: "read", label: words.read, list: order.map((at) => typed[at] ?? ""), movable: editable },
  ];

  return (
    <div className="flex grow flex-col gap-3" data-testid="knowing-the-order">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-soft">{words.sentence}</span>
        <input
          value={state.sentence}
          maxLength={MOST_LETTERS}
          readOnly={!editable}
          onChange={(event) =>
            update({ sentence: event.target.value.slice(0, MOST_LETTERS), order: [] })
          }
          className="min-h-11 rounded-control border border-hairline bg-paper px-3 py-2 text-base"
        />
      </label>
      <p className="min-h-5 text-sm text-ink-soft">
        {typed.length < 2
          ? words.fewWords
          : (state.sentence.match(/[a-z']+/gi)?.length ?? 0) > MOST_WORDS
            ? words.most
            : ""}
      </p>
      {rows.map(({ key, label, list, movable }) => (
        <section key={key} className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{label}</p>
          <ol
            className="flex min-h-24 flex-wrap items-start gap-2 rounded-card border border-hairline bg-paper p-2"
            data-row={key}
          >
            {list.map((word, at) => (
              <li
                key={`${word}-${at}`}
                className="flex flex-col items-center gap-1 rounded-inner border border-ink-soft bg-card px-2 py-1"
              >
                <span className="text-sm">{word}</span>
                <Stamp at={at} strength={state.strength} speed={state.speed} />
                {movable && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      aria-label={words.earlier(word)}
                      disabled={at === 0}
                      onClick={() => update({ order: moved(order, at, -1) })}
                      className={ARROW}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label={words.later(word)}
                      disabled={at === list.length - 1}
                      onClick={() => update({ order: moved(order, at, 1) })}
                      className={ARROW}
                    >
                      →
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
      {editable && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BUTTON}
            onClick={() => update({ order: [...order].reverse() })}
          >
            {words.reverse}
          </button>
          <button type="button" className={BUTTON} onClick={() => update({ order: [] })}>
            {words.restore}
          </button>
        </div>
      )}
      <div
        className="flex min-h-16 flex-col gap-1 text-sm"
        data-difference={frame.difference.toFixed(6)}
      >
        <p>{frame.shuffled ? words.difference(frame.difference) : words.same}</p>
        <div
          role="meter"
          aria-label={words.meter}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, frame.difference / 0.2) * 100)}
          aria-valuetext={frame.shuffled ? words.difference(frame.difference) : words.same}
          className="h-3 w-full max-w-sm rounded-pill border border-hairline bg-inset"
        >
          <div
            className="h-full rounded-pill bg-flow"
            style={{ width: `${Math.min(1, frame.difference / 0.2) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
