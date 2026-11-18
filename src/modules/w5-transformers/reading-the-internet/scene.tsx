"use client";

import { useMemo, useSyncExternalStore } from "react";
import { loadWriters } from "@/engine/language/files";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useWriterPractice } from "@/features/language/use-writer-practice";
import type { ModuleViewProps } from "@/platform/contract";
import { TEXTS, words } from "./captions";
import {
  byHeart,
  configOf,
  frameOf,
  MOST_LETTERS,
  MOST_STEPS,
  runOf,
  type ReadingFrame,
  type ReadingState,
} from "./model";

type Props = ModuleViewProps<ReadingState, ReadingFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";
const TEXT_KEYS = ["rhymes", "animals", "sentence"] as const;
/** A new text starts a new run from nothing. */
export const FRESH = { steps: 0, running: false };

/** The text to read, what baby GPT writes at the moment on the timeline, and how far it got. */
export function ReadingScene(props: Props) {
  const { state, update, timeline, side } = props;
  const { text, learning } = state;
  const loaded = useLanguageFile(loadWriters);
  const writer = loaded.status === "ready" ? loaded.value.writer : null;
  const config = useMemo(
    () => (writer ? configOf(writer, { text, learning }) : null),
    [writer, text, learning],
  );
  const run = runOf(state);
  const failure = useWriterPractice({
    ...props,
    config,
    runKey: run,
    most: MOST_STEPS,
    toFrame: (moment, key) => frameOf(writer ?? { letters: "" }, moment, key),
  });
  useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const current = timeline.current();
  const frame = current?.run === run ? current : undefined;
  const editable = side === "main";
  const learned = frame ? byHeart(text, frame) : false;

  return (
    <div className="flex grow flex-col gap-3" data-testid="reading-the-internet">
      <label className="flex flex-col gap-1 text-sm">
        <span>{words.box}</span>
        <textarea
          value={text}
          maxLength={MOST_LETTERS}
          rows={4}
          readOnly={!editable}
          onChange={(event) =>
            update({ text: event.target.value.slice(0, MOST_LETTERS), ...FRESH })
          }
          className="min-h-24 w-full rounded-control border border-hairline bg-paper p-2 text-base"
        />
      </label>
      {editable && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{words.texts.label}</span>
          {TEXT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={BUTTON}
              data-text={key}
              onClick={() => update({ text: TEXTS[key], ...FRESH })}
            >
              {words.texts[key]}
            </button>
          ))}
        </div>
      )}
      {!writer ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-48"
        />
      ) : failure ? (
        <p role="alert" className="min-h-48 rounded-card border border-hairline bg-card p-4">
          {words.failed}
        </p>
      ) : !config ? (
        <p className="min-h-48 text-sm text-ink-soft">{words.short}</p>
      ) : (
        <section className="flex min-h-48 flex-col gap-2" data-step={frame?.step ?? 0}>
          <p className="text-sm text-ink-soft">{words.writes}</p>
          <p
            aria-label={words.writesLabel}
            className="min-h-24 rounded-card border border-hairline bg-paper p-3 text-base whitespace-pre-wrap"
            data-sample
          >
            {frame?.sample ?? ""}
          </p>
          <div className="flex min-h-12 flex-col text-sm">
            <p>{words.steps(frame?.step ?? 0, (frame?.step ?? 0) >= MOST_STEPS)}</p>
            <p className="text-ink-soft" data-by-heart={learned ? "" : undefined}>
              {frame ? (learned ? words.byHeart : words.surprise(frame.loss)) : ""}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
