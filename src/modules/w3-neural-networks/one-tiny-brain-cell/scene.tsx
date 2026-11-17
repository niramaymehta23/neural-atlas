"use client";

import { WeightStrings } from "@/features/building/WeightStrings";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  MAX_TRUST,
  MIXES,
  sayYes,
  sureness,
  VOICES,
  type CellFrame,
  type CellState,
} from "./model";

type Props = ModuleViewProps<CellState, CellFrame>;

/** The cell's answer for the voices of today, in words. */
export function answerWords(state: CellState) {
  const chance = sayYes(state, state.voices);
  return {
    chance,
    yes: chance >= 0.5,
    sure: words.sure[sureness(chance)],
  };
}

/** Three voices on strings, the cell they pull on, and every possible day. */
export function CellScene({ state, update, side }: Props) {
  const main = side === "main";
  const { chance, yes, sure } = answerWords(state);
  const change = (next: Partial<CellState>) =>
    update(({ changes }) => ({ ...next, changes: changes + 1 }));
  return (
    <div className="flex grow flex-col gap-4" data-testid="one-tiny-brain-cell">
      <WeightStrings
        voices={VOICES.map((id, index) => ({
          name: words.voices[id],
          on: (state.voices[index] ?? 0) === 1,
        }))}
        weights={state.weights}
        max={MAX_TRUST}
        onWeight={
          main
            ? (index, weight) =>
                change({ weights: state.weights.map((old, at) => (at === index ? weight : old)) })
            : undefined
        }
        onVoice={
          main
            ? (index) =>
                change({ voices: state.voices.map((old, at) => (at === index ? 1 - old : old)) })
            : undefined
        }
        output={chance}
        words={{
          ...words.strings,
          cell: words.cell(yes ? words.says.yes : words.says.no, sure),
        }}
      />
      <figure className="flex flex-col gap-1 text-sm">
        <figcaption className="font-medium">{words.days.title}</figcaption>
        <p className="text-xs text-ink-soft">{words.days.note}</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4" data-days>
          {MIXES.map((voices) => {
            const goes = sayYes(state, voices) >= 0.5;
            return (
              <li
                key={voices.join("")}
                className="flex items-center gap-2"
                data-day={voices.join("")}
                data-goes={goes}
              >
                <svg viewBox="0 0 44 12" className="h-3 w-11 shrink-0" aria-hidden>
                  {voices.map((on, index) => (
                    <circle
                      key={index}
                      cx={6 + index * 16}
                      cy={6}
                      r={4.5}
                      fill={on ? "var(--color-ink)" : "none"}
                      stroke="var(--color-ink)"
                    />
                  ))}
                </svg>
                <span className={goes ? "font-medium" : "text-ink-soft"}>
                  {goes ? words.days.yes : words.days.no}
                </span>
              </li>
            );
          })}
        </ul>
      </figure>
    </div>
  );
}
