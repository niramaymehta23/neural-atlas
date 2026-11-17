"use client";

import { useId } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  cleanMessage,
  MOST_LETTERS,
  reading,
  saysSpam,
  strengthOf,
  thresholdOf,
  type SpamState,
} from "./model";

type Props = ModuleViewProps<SpamState>;

/** One word as a chip: a sign and one to three marks say which way and how strongly (A11Y-08). */
function WordChip({ word, value }: { word: string; value: number }) {
  const strength = strengthOf(value);
  const named = words.strength[strength];
  const label =
    value > 0
      ? words.leans.spam(word, named)
      : value < 0
        ? words.leans.normal(word, named)
        : words.leans.none(word);
  const tone =
    value > 0
      ? "border-ink bg-ink text-paper"
      : value < 0
        ? "border-ink bg-paper text-ink"
        : "border-dashed border-ink-soft bg-paper text-ink-soft";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "·";
  return (
    <li
      aria-label={label}
      title={label}
      className={`flex items-center gap-1 rounded-pill border px-3 py-1 text-sm ${tone}`}
    >
      <span>{word}</span>
      <span aria-hidden="true" className="font-semibold">
        {value === 0 ? sign : sign.repeat(strength)}
      </span>
    </li>
  );
}

/** The message box, every word's clue, and the verdict with its "sure enough" line. */
export function SpamScene({ state, update, side }: Props) {
  const main = side === "main";
  const boxId = useId();
  const { words: read, verdict } = reading(state);
  const spam = saysSpam(state);
  const line = thresholdOf(state.suspicion);
  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="the-spam-detective"
      data-verdict={read.length ? (spam ? "spam" : "normal") : "none"}
    >
      {main && (
        <div className="flex flex-col gap-1">
          <label htmlFor={boxId} className="text-sm text-ink-soft">
            {words.message}
          </label>
          <textarea
            id={boxId}
            value={state.message}
            maxLength={MOST_LETTERS}
            rows={3}
            placeholder={words.placeholder}
            onChange={(event) => update({ message: cleanMessage(event.target.value) })}
            className="rounded-control border border-hairline bg-paper px-3 py-2 text-base"
          />
          <p className="min-h-5 text-xs text-ink-soft" aria-live="polite">
            {state.message.length >= MOST_LETTERS ? words.tooLong : ""}
          </p>
        </div>
      )}
      <section className="flex min-h-24 flex-col gap-2">
        <h3 className="text-sm text-ink-soft">{words.clues}</h3>
        {read.length === 0 ? (
          <p className="text-sm text-ink-soft">{words.noWords}</p>
        ) : (
          <ul className="flex flex-wrap gap-2" data-chips>
            {read.map((word, at) => (
              <WordChip key={`${at}-${word}`} word={word} value={verdict.clues[at] ?? 0} />
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2" data-verdict-box>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-ink-soft">{words.verdict.label}</span>
          <strong className="font-serif text-2xl">
            {read.length === 0 ? "" : spam ? words.verdict.spam : words.verdict.normal}
          </strong>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span>{words.sure}</span>
          <div
            className="relative h-4 overflow-hidden rounded-pill border border-ink-soft bg-paper"
            aria-hidden="true"
          >
            <div
              className="h-full bg-ink-soft motion-safe:transition-[width]"
              style={{ width: `${Math.round(verdict.chance * 100)}%` }}
            />
            <div
              className="absolute top-0 h-full w-1 bg-ink"
              style={{ left: `calc(${Math.round(line * 100)}% - 2px)` }}
            />
          </div>
          <span className="text-xs text-ink-soft">{words.line}</span>
        </div>
      </section>
    </div>
  );
}
