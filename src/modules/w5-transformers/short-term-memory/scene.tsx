"use client";

import { useMemo } from "react";
import { loadWriters } from "@/engine/language/files";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import { WordChances } from "@/features/language/WordChances";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { chatOf, frameOf, NAMES, type MemoryFrame, type MemoryState } from "./model";

type Props = ModuleViewProps<MemoryState, MemoryFrame>;

const CHIP = "min-h-11 rounded-pill border px-3 py-1.5 text-sm md:min-h-0";

/** The name to remember, the chat seen through the tunnel, and the storyteller's answer. */
export function MemoryScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadWriters);
  const teller = loaded.status === "ready" ? loaded.value.storyteller : null;
  const frame = useMemo(() => (teller ? frameOf(teller, state) : null), [teller, state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const chat = chatOf(state);
  const firstSeen = chat.length - state.window;
  const answer = frame?.answers[0]?.word ?? "";

  return (
    <div className="flex grow flex-col gap-3" data-testid="short-term-memory">
      {editable && (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm">
          <legend className="mb-1 text-ink-soft">{words.name}</legend>
          {NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={state.name === name}
              onClick={() => update({ name })}
              className={`${CHIP} ${state.name === name ? "border-2 border-ink bg-card font-semibold" : "border-hairline bg-paper text-accent-ink"}`}
            >
              {name}
            </button>
          ))}
        </fieldset>
      )}
      <ol
        aria-label={words.chat}
        className="flex flex-wrap gap-1 rounded-card border border-hairline bg-paper p-3 text-sm"
        data-chat
      >
        {chat.map((word, at) => {
          const seen = at >= firstSeen;
          return (
            <li
              key={at}
              data-seen={seen ? "" : undefined}
              className={`rounded-inner px-1.5 py-0.5 ${
                seen
                  ? "border border-ink"
                  : "border border-dashed border-hairline text-ink-soft line-through opacity-60"
              } ${word === state.name ? "font-semibold" : ""}`}
            >
              {word}
              {!seen && <span className="sr-only"> ({words.outOfView})</span>}
            </li>
          );
        })}
      </ol>
      {!teller || !frame ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-48"
        />
      ) : (
        <section
          className="flex min-h-48 flex-col gap-2 text-sm"
          data-in-view={frame.inView ? "" : undefined}
        >
          <p>{frame.inView ? words.inView(state.name) : words.gone(state.name)}</p>
          <p className="font-semibold" data-answer={answer}>
            {answer === state.name ? words.right(answer) : words.wrong(answer)}
          </p>
          <p className="text-ink-soft">{words.question}</p>
          <WordChances chances={frame.answers} words={words.chances} />
        </section>
      )}
    </div>
  );
}
