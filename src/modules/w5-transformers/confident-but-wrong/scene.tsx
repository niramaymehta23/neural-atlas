"use client";

import { useMemo } from "react";
import { loadWriters } from "@/engine/language/files";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { fakeSource, frameOf, type TruthFrame, type TruthState } from "./model";

type Props = ModuleViewProps<TruthState, TruthFrame>;

const CHIP = "min-h-11 rounded-pill border px-3 py-1.5 text-sm md:min-h-0";
const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:opacity-40 md:min-h-0";

/** The animal to ask about, its answer, and how sure it sounds beside whether it is true. */
export function TruthScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadWriters);
  const writers = loaded.status === "ready" ? loaded.value : null;
  const frame = useMemo(() => (writers ? frameOf(writers, state) : null), [writers, state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const facts = writers?.animals[state.animal];

  return (
    <div className="flex grow flex-col gap-3" data-testid="confident-but-wrong">
      {editable && writers && (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm">
          <legend className="mb-1 text-ink-soft">{words.animal}</legend>
          {Object.keys(writers.animals).map((animal) => (
            <button
              key={animal}
              type="button"
              aria-pressed={state.animal === animal}
              onClick={() => update({ animal, source: false })}
              className={`${CHIP} ${state.animal === animal ? "border-2 border-ink bg-card font-semibold" : "border-hairline bg-paper text-accent-ink"}`}
            >
              {animal}
            </button>
          ))}
        </fieldset>
      )}
      {!writers || !frame || !facts ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-96"
        />
      ) : (
        <div className="flex min-h-96 flex-col gap-3">
          <section className="flex flex-col gap-1 rounded-card border border-hairline bg-paper p-3">
            <p className="text-sm text-ink-soft">{words.question(frame.question)}</p>
            <p className="text-base font-semibold" data-answer>
              {words.answer(frame.answer)}
            </p>
            <p className="min-h-5 text-sm" data-source={frame.book ?? undefined}>
              {frame.book !== null ? words.source(frame.book) : ""}
            </p>
            {editable && (
              <button
                type="button"
                className={`${BUTTON} self-start`}
                disabled={state.source}
                onClick={() => update({ source: true })}
              >
                {words.askSource}
              </button>
            )}
          </section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <section className="flex flex-col gap-2 rounded-card border border-hairline bg-card p-3 text-sm">
              <p className="font-semibold">{words.sure}</p>
              <div
                role="meter"
                aria-label={words.meter}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(frame.sure * 100)}
                aria-valuetext={words.sureWords(frame.sure)}
                className="h-3 w-full rounded-pill border border-hairline bg-inset"
              >
                <div
                  className="h-full rounded-pill bg-flow"
                  style={{ width: `${frame.sure * 100}%` }}
                />
              </div>
              <p>{words.sureWords(frame.sure)}</p>
            </section>
            <section
              className="flex flex-col gap-2 rounded-card border border-hairline bg-card p-3 text-sm"
              data-truth={frame.truth}
            >
              <p className="font-semibold">{words.true}</p>
              <p>{words.truth[frame.truth]}</p>
              {frame.book !== null && (
                <p data-fake={fakeSource(frame) ? "" : undefined}>
                  {frame.real ? words.sourceTruth.real : words.sourceTruth.fake}
                </p>
              )}
            </section>
          </div>
          <section className="flex flex-col gap-1 text-sm text-ink-soft">
            <p className="font-semibold text-ink">{words.books}</p>
            <p>
              {words.facts.eats(state.animal, facts.eats)}{" "}
              {words.facts.lives(state.animal, facts.lives)}{" "}
              {words.facts.colour(state.animal, facts.colour)}
            </p>
            <p>{words.facts.book(facts.book)}</p>
          </section>
        </div>
      )}
    </div>
  );
}
