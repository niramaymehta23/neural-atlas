"use client";

import { useMemo } from "react";
import { count, outOf } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs } from "@/data/datasets";
import { DataLens, lensCount } from "@/features/inside/DataLens";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  chancesAt,
  dotChances,
  dotsFor,
  guessOf,
  picksFor,
  sureAndWrong,
  type SureState,
} from "./model";

type Props = ModuleViewProps<SureState>;

const FIELD = 48;
const GRID = gridInputs(FIELD);
const VIEW = 200;
const LENS_RADIUS = 0.3;
const toView = (value: number) => ((value + 1) / 2) * VIEW;

/** What the glass shows, in one sentence (also used by `describe`). */
export function lensSentence(state: SureState): string {
  const { inside, sure } = lensCount(
    dotsFor(state.overlap),
    dotChances(state),
    state.lens,
    LENS_RADIUS,
  );
  return inside === 0
    ? words.lens.empty
    : words.lens.readout(words.lens.flowers(count(inside), inside === 1), count(sure));
}

/** The flowers with the sorter's shading, a magnifying glass, and five flowers' sureness bars. */
export function SureScene({ state, update, side }: Props) {
  const { boast, overlap } = state;
  const dots = dotsFor(overlap);
  // The shading depends only on the two dials, not on where the glass is.
  const chances = useMemo(() => dotChances({ boast, overlap }), [boast, overlap]);
  const field = useMemo(
    () => Float32Array.from(chancesAt({ boast, overlap }, GRID)),
    [boast, overlap],
  );
  const picks = picksFor(overlap);
  return (
    <div className="flex grow flex-col gap-3" data-testid="how-sure-is-it">
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-card border border-hairline bg-paper">
        <div className="absolute inset-0">
          <DecisionField outputs={field} groups={2} resolution={FIELD} />
        </div>
        <svg
          role="img"
          aria-label={words.field}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="absolute inset-0 size-full"
        >
          {dots.map(({ x, y, label }, index) => (
            <path
              key={index}
              d={markPath(classMark(label), toView(x), toView(-y), 3.4)}
              fill={classTone(label)}
              stroke="var(--color-ink)"
              strokeWidth={0.8}
            />
          ))}
          {picks.map((index, pick) => {
            const dot = dots[index];
            if (!dot) return null;
            return (
              <text
                key={pick}
                x={toView(dot.x) + 5}
                y={toView(-dot.y) - 5}
                className="fill-ink text-[11px] font-semibold"
                data-pick={words.letters[pick]}
              >
                {words.letters[pick]}
              </text>
            );
          })}
        </svg>
        {side === "main" && (
          <DataLens
            points={dots}
            chances={chances}
            lens={state.lens}
            onMove={(lens) => update({ lens, looked: true })}
            words={words.lens}
            radius={LENS_RADIUS}
          />
        )}
      </div>
      {side === "main" && <p className="min-h-10 text-sm text-ink-soft">{lensSentence(state)}</p>}
      <ul className="flex flex-col gap-2 text-sm" aria-label={words.picked}>
        {picks.map((index, pick) => {
          const dot = dots[index];
          if (!dot) return null;
          const guess = guessOf(dot, chances[index] ?? 0.5, index);
          const letter = words.letters[pick] ?? "";
          return (
            <li
              key={pick}
              className="flex flex-col gap-1"
              data-guess={guess.right ? "right" : "wrong"}
            >
              <span>
                {words.guess(letter, words.flowers[guess.says] ?? "")}
                {", "}
                {words.sure(outOf(guess.sure, { noun: "" }))}
                {!guess.right && (
                  <span className="text-ink-soft">
                    {" · "}
                    {words.wrong(words.flowers[dot.label] ?? "")}
                  </span>
                )}
              </span>
              <span
                role="meter"
                aria-label={words.barLabel(letter)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(guess.sure * 100)}
                aria-valuetext={words.sure(outOf(guess.sure, { noun: "" }))}
                className="block h-2 w-full overflow-hidden rounded-pill border border-ink-soft bg-card"
              >
                <span
                  className="block h-full bg-ink"
                  style={{ width: `${Math.round(guess.sure * 100)}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="min-h-5 text-sm" data-certain-wrong>
        {sureAndWrong(state) ? words.certainWrong : ""}
      </p>
    </div>
  );
}
