"use client";

import { count, sentenceStart } from "@/design/copy";
import { WeightStrings } from "@/features/building/WeightStrings";
import type { ModuleViewProps, TimelineFrame } from "@/platform/contract";
import { words } from "./captions";
import {
  averageMiss,
  closeness,
  FACTS,
  fit,
  guesses,
  misses,
  newHouses,
  type SeesState,
} from "./model";

type Props = ModuleViewProps<SeesState, TimelineFrame>;

/** The longest bar stands for this price. */
const TOP_PRICE = 6.5;
const STRING_MAX = 4.5;
const width = (price: number) =>
  `${(Math.min(1, Math.max(0, price / TOP_PRICE)) * 100).toFixed(1)}%`;

/** The facts on strings (tap one to tell or hide it) and the guesser's prices for new houses. */
export function SeesScene({ state, update, side }: Props) {
  const main = side === "main";
  const { weights } = fit(state);
  const real = newHouses(state);
  const guessed = guesses(state);
  const missed = misses(state);
  const overall = closeness(averageMiss(state));
  return (
    <div className="grid grow gap-4 md:grid-cols-2" data-testid="what-the-machine-sees">
      <WeightStrings
        voices={FACTS.map((fact, index) => ({
          name: words.facts[fact],
          on: state.told[index] ?? false,
        }))}
        weights={weights}
        max={STRING_MAX}
        onVoice={
          main
            ? (index) =>
                update(({ told, changes }) => ({
                  told: told.map((on, at) => (at === index ? !on : on)),
                  changes: changes + 1,
                }))
            : undefined
        }
        output={Math.min(1, Math.max(0, (guessed[0] ?? 0) / TOP_PRICE))}
        words={words.strings}
      />
      <section className="flex flex-col gap-2" aria-label={words.newHouses}>
        <h3 className="text-sm font-medium">{words.newHouses}</h3>
        <p className="text-xs text-ink-soft">{words.key}</p>
        <ul className="flex flex-col gap-2">
          {real.map((house, index) => {
            const how = closeness(missed[index] ?? 0);
            return (
              <li
                key={index}
                className="flex flex-col gap-1 text-xs"
                data-house={index}
                data-close={how}
              >
                <span>
                  {words.house(count(index + 1))}
                  <span className="text-ink-soft"> · {words.close[how]}</span>
                </span>
                <span className="sr-only">{words.real}</span>
                <span
                  className="block h-2.5 rounded-pill bg-ink"
                  style={{ width: width(house.price) }}
                />
                <span className="sr-only">{words.guess}</span>
                <span
                  className="block h-2.5 rounded-pill border-2 border-dashed border-ink"
                  style={{ width: width(guessed[index] ?? 0) }}
                  data-guess-bar
                />
              </li>
            );
          })}
        </ul>
        <p className="text-sm" data-overall={overall}>
          {sentenceStart(words.overall[overall])}
        </p>
      </section>
    </div>
  );
}
