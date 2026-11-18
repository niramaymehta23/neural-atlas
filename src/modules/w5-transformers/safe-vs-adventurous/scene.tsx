"use client";

import { useDeferredValue, useMemo } from "react";
import { loadWriters } from "@/engine/language/files";
import { unknownWords } from "@/engine/language/writers";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import { WordChances } from "@/features/language/WordChances";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  barsOf,
  frameOf,
  MOST_LETTERS,
  MOST_SEED,
  startScores,
  type SamplingFrame,
  type SamplingState,
} from "./model";

type Props = ModuleViewProps<SamplingState, SamplingFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0";

/**
 * The chance bars follow the dials at once (from scores worked out once per start); the story,
 * which takes longer to write, follows a moment later.
 */
export function SamplingScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadWriters);
  const teller = loaded.status === "ready" ? loaded.value.storyteller : null;
  const scores = useMemo(
    () => (teller ? startScores(teller, state.start) : null),
    [teller, state.start],
  );
  const bars = teller && scores ? barsOf(teller, scores, state) : null;
  const later = useDeferredValue(state);
  const frame = useMemo(() => (teller ? frameOf(teller, later) : null), [teller, later]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const unknown = teller ? unknownWords(teller, state.start) : [];

  return (
    <div className="flex grow flex-col gap-3" data-testid="safe-vs-adventurous">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-soft">{words.start}</span>
        <input
          value={state.start}
          maxLength={MOST_LETTERS}
          readOnly={!editable}
          onChange={(event) => update({ start: event.target.value.slice(0, MOST_LETTERS) })}
          className="min-h-11 rounded-control border border-hairline bg-paper px-3 py-2 text-base"
        />
      </label>
      {!teller ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-96"
        />
      ) : !bars ? (
        <p className="min-h-96 text-sm text-ink-soft" data-unknown>
          {unknown.length > 0
            ? words.unknown(unknown.map((word) => `“${word}”`).join(", "))
            : words.empty}
        </p>
      ) : (
        <div className="flex min-h-96 flex-col gap-3">
          <section className="flex flex-col gap-1">
            <p className="text-sm text-ink-soft">{words.next}</p>
            <WordChances chances={bars} words={words.chances} />
          </section>
          <section className="flex flex-col gap-1" data-writing={later !== state ? "" : undefined}>
            <p className="text-sm text-ink-soft">{words.story}</p>
            <p
              aria-label={words.storyLabel}
              className="min-h-28 rounded-card border border-hairline bg-paper p-3 text-base leading-relaxed"
              data-story
            >
              {state.start} <span className="font-semibold">{frame?.story.join(" ")}</span>
            </p>
            <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
              {editable && (
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => update({ seed: (state.seed % MOST_SEED) + 1 })}
                >
                  {words.writeAgain}
                </button>
              )}
              <span data-surprise={frame?.surprise.toFixed(2)}>
                {frame?.known ? words.surprise(frame.surprise) : ""}
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
