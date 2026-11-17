"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { attentionReader } from "@/engine/pretrained/attention-client";
import type { Reading } from "@/engine/pretrained/attention";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  focusAfterMove,
  frameFor,
  moveWord,
  threadsFor,
  type LookingFrame,
  type LookingState,
} from "./model";
import { ThreadView } from "./threads";

type Props = ModuleViewProps<LookingState, LookingFrame>;

/** Typing pauses this long before the sentence is read again. */
const SETTLE_MS = 250;
const MAX_LETTERS = 90;

type Loaded = { sentence: string; reading: Reading };

/**
 * The sentence's reading, asked for once typing settles; the model loads on first use. A reader
 * that fails or times out is handed to the lesson's error boundary (thrown from the scene).
 */
function useReading(sentence: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failure, setFailure] = useState<Error | null>(null);
  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      attentionReader()
        .read(sentence)
        .then(
          (reading) => current && setLoaded({ sentence, reading }),
          (error: unknown) =>
            current && setFailure(error instanceof Error ? error : new Error(String(error))),
        );
    }, SETTLE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [sentence]);
  return { loaded, failure };
}

/** Type a sentence, then watch who looks at whom; drag words to re-route the threads. */
export function LookingScene({ state, update, timeline, side }: Props) {
  const { loaded, failure } = useReading(state.sentence);
  const reading = loaded?.reading ?? null;
  const threads = useMemo(() => (reading ? threadsFor(reading, state) : null), [reading, state]);

  // Every reading the learner sees is recorded, so missions and guesses can check it.
  const readings = useRef(0);
  useEffect(() => {
    if (!reading || !loaded) return;
    readings.current += 1;
    timeline.record(frameFor(reading, { ...state, sentence: loaded.sentence }, readings.current));
  }, [reading, loaded, state, timeline]);

  if (failure) throw failure;
  const editable = side === "main";
  return (
    <div className="flex grow flex-col gap-4" data-testid="looking" data-ready={String(!!threads)}>
      {editable && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">{words.sentence}</span>
          <input
            value={state.sentence}
            maxLength={MAX_LETTERS}
            onChange={(event) => update({ sentence: event.target.value, focus: -1 })}
            className="rounded-control border border-hairline bg-paper px-3 py-2 text-base"
          />
        </label>
      )}
      {threads ? (
        <>
          <ThreadView
            threads={threads}
            focus={state.focus}
            onFocus={(focus) => update({ focus })}
            onMove={
              // Moving words is held back until the reading matches what was just typed.
              editable && loaded?.sentence === state.sentence
                ? (from, to) =>
                    update(({ focus }) => ({
                      sentence: moveWord(threads.words, from, to),
                      focus: focusAfterMove(focus, from, to),
                    }))
                : undefined
            }
          />
          {editable && <p className="text-sm text-ink-soft">{words.dragHint}</p>}
        </>
      ) : (
        <p role="status" className="py-16 text-center text-ink-soft">
          {words.waking}
        </p>
      )}
    </div>
  );
}
