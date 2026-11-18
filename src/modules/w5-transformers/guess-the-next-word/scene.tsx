"use client";

import { useMemo } from "react";
import { loadWriters } from "@/engine/language/files";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import { WordChances } from "@/features/language/WordChances";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  frameOf,
  MOST_ADDED,
  MOST_LETTERS,
  MOST_SEED,
  storyWords,
  unknownWords,
  type NextFrame,
  type NextState,
} from "./model";

type Props = ModuleViewProps<NextState, NextFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:opacity-40 md:min-h-0";

/** The start, the story so far, the next-word chances and the slot machine's buttons. */
export function NextScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadWriters);
  const teller = loaded.status === "ready" ? loaded.value.storyteller : null;
  const frame = useMemo(() => (teller ? frameOf(teller, state) : null), [teller, state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const unknown = teller ? unknownWords(teller, state.start) : [];
  const full = state.added >= MOST_ADDED;

  return (
    <div className="flex grow flex-col gap-3" data-testid="guess-the-next-word">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-soft">{words.start}</span>
        <input
          value={state.start}
          maxLength={MOST_LETTERS}
          readOnly={!editable}
          onChange={(event) =>
            update({ start: event.target.value.slice(0, MOST_LETTERS), added: 0 })
          }
          className="min-h-11 rounded-control border border-hairline bg-paper px-3 py-2 text-base"
        />
      </label>
      {!teller || !frame ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-80"
        />
      ) : !frame.known ? (
        <p className="min-h-80 text-sm text-ink-soft" data-unknown>
          {unknown.length > 0
            ? words.unknown(unknown.map((word) => `“${word}”`).join(", "))
            : words.empty}
        </p>
      ) : (
        <div className="flex min-h-80 flex-col gap-3">
          <p
            aria-label={words.story}
            className="min-h-20 rounded-card border border-hairline bg-paper p-3 text-base leading-relaxed"
            data-story
          >
            {storyWords(state.start).join(" ")}{" "}
            {frame.written.map((word, at) => (
              <span
                key={at}
                className="font-semibold underline decoration-dotted underline-offset-4"
              >
                {word}{" "}
              </span>
            ))}
          </p>
          <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
            {editable && (
              <>
                <button
                  type="button"
                  className={BUTTON}
                  disabled={full}
                  onClick={() => update({ added: Math.min(MOST_ADDED, state.added + 1) })}
                >
                  {words.spin}
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  disabled={full}
                  onClick={() => update({ added: Math.min(MOST_ADDED, state.added + 10) })}
                >
                  {words.spinTen}
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => update({ added: 0, seed: (state.seed % MOST_SEED) + 1 })}
                >
                  {words.again}
                </button>
              </>
            )}
            <span className="text-ink-soft">{full ? words.full : words.written(state.added)}</span>
          </div>
          <p
            className="min-h-5 text-sm font-semibold"
            data-circles={frame.circles ? "" : undefined}
          >
            {frame.circles ? words.circles : ""}
          </p>
          <section className="flex flex-col gap-1">
            <p className="text-sm text-ink-soft">{words.next}</p>
            <WordChances chances={frame.next} words={words.chances} />
          </section>
        </div>
      )}
    </div>
  );
}
