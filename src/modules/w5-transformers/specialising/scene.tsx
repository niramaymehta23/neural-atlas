"use client";

import { useMemo, useSyncExternalStore } from "react";
import { loadWriters } from "@/engine/language/files";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useWriterPractice } from "@/features/language/use-writer-practice";
import type { ModuleViewProps } from "@/platform/contract";
import { PIRATE, words } from "./captions";
import {
  configOf,
  frameOf,
  MOST_LETTERS,
  MOST_STEPS,
  runOf,
  talksLikeAPirate,
  type TuneFrame,
  type TuneState,
} from "./model";

type Props = ModuleViewProps<TuneState, TuneFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";
/** A new style or setting starts again from the everyday writer. */
export const FRESH = { steps: 0, running: false };

/** The style to practise, what the writer writes at the moment on the timeline, and what it kept. */
export function TuneScene(props: Props) {
  const { state, update, timeline, side } = props;
  const { text, learning, mix } = state;
  const loaded = useLanguageFile(loadWriters);
  const writer = loaded.status === "ready" ? loaded.value.writer : null;
  const config = useMemo(
    () => (writer ? configOf(writer, { text, learning, mix }) : null),
    [writer, text, learning, mix],
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

  return (
    <div className="flex grow flex-col gap-3" data-testid="specialising">
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
      <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
        {editable && text !== PIRATE && (
          <button
            type="button"
            className={BUTTON}
            onClick={() => update({ text: PIRATE, ...FRESH })}
          >
            {words.bringBack}
          </button>
        )}
      </div>
      {!writer ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-56"
        />
      ) : failure ? (
        <p role="alert" className="min-h-56 rounded-card border border-hairline bg-card p-4">
          {words.failed}
        </p>
      ) : !config ? (
        <p className="min-h-56 text-sm text-ink-soft">{words.short}</p>
      ) : (
        <section className="flex min-h-56 flex-col gap-2" data-step={frame?.step ?? 0}>
          <p className="text-sm text-ink-soft">{words.writes}</p>
          <p
            aria-label={words.writesLabel}
            className="min-h-24 rounded-card border border-hairline bg-paper p-3 text-base whitespace-pre-wrap [overflow-wrap:anywhere]"
            data-sample
          >
            {frame?.sample ?? ""}
          </p>
          <div className="flex min-h-16 flex-col text-sm">
            <p>{words.steps(frame?.step ?? 0, (frame?.step ?? 0) >= MOST_STEPS)}</p>
            <p data-pirate={frame && talksLikeAPirate(frame.sample) ? "" : undefined}>
              {frame ? words.pirate(talksLikeAPirate(frame.sample)) : ""}
            </p>
            <p className="text-ink-soft" data-everyday={frame?.everyday.toFixed(2)}>
              {frame ? words.everyday(frame.everyday) : ""}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
