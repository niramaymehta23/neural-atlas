"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  attentionReader,
  ReaderError,
  type AttentionReader,
} from "@/engine/pretrained/attention-client";
import { hasUnreadWords, readable, wordsOf, type Reading } from "@/engine/pretrained/attention";
import type { FailureStage } from "@/engine/pretrained/protocol";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { ReaderGallery } from "./gallery";
import {
  focusAfterMove,
  frameFor,
  itLooksAt,
  MOST_LETTERS,
  moveWord,
  threadsFor,
  type LookingFrame,
  type LookingState,
} from "./model";
import { nameReader } from "./readers";
import { ThreadView } from "./threads";

type Props = ModuleViewProps<LookingState, LookingFrame>;

/** Typing pauses this long before the sentence is read again. */
const SETTLE_MS = 250;

type Loaded = { sentence: string; reading: Reading };
type Failure = { sentence: string; stage: FailureStage };

/**
 * The sentence's reading (as read: clipped, at most 16 words), asked for once typing settles; the
 * model loads on first use. The scene holds the reader while it is on screen, so an unused
 * worker can be ended. A failure is kept with its stage so the scene can say what went wrong.
 */
export function useReading(sentence: string, reader: AttentionReader = attentionReader()) {
  const asked = readable(sentence);
  const enough = wordsOf(sentence).length >= 2;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const progress = useSyncExternalStore(reader.subscribe, reader.getProgress, () => null);

  useEffect(() => reader.retain(), [reader]);

  useEffect(() => {
    if (!enough) return;
    let current = true;
    const timer = setTimeout(() => {
      reader.read(asked).then(
        (reading) => {
          if (!current) return;
          setLoaded({ sentence: asked, reading });
          setFailure(null);
        },
        (error: unknown) => {
          if (!current) return;
          const stage = error instanceof ReaderError ? error.stage : "read";
          setFailure({ sentence: asked, stage });
        },
      );
    }, SETTLE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [asked, enough, attempt, reader]);

  return {
    asked,
    enough,
    loaded,
    /** Only a failure for the sentence being asked about now counts. */
    failure: failure?.sentence === asked ? failure.stage : null,
    progress,
    retry: () => {
      setFailure(null);
      setAttempt((count) => count + 1);
    },
  };
}

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

/** Type a sentence, then watch who looks at whom; drag words to re-route the threads. */
export function LookingScene({ state, update, timeline, side }: Props) {
  const { asked, enough, loaded, failure, progress, retry } = useReading(state.sentence);
  const reading = loaded?.reading ?? null;
  const upToDate = loaded?.sentence === asked;
  const threads = useMemo(() => (reading ? threadsFor(reading, state) : null), [reading, state]);

  // Every reading the learner sees is recorded, so missions and guesses can check it.
  const readings = useRef(0);
  useEffect(() => {
    if (!reading || !loaded) return;
    readings.current += 1;
    timeline.record(frameFor(reading, { ...state, sentence: loaded.sentence }, readings.current));
  }, [reading, loaded, state, timeline]);

  const editable = side === "main";
  const frame = useMemo(() => (reading ? frameFor(reading, state, 0) : null), [reading, state]);
  const showing = nameReader(state.reader, frame?.habits, frame?.threads.words ?? []);
  const notExample = readable(state.sentence) !== readable(words.example);

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="looking"
      data-ready={String(!!threads && upToDate && enough)}
      data-reading={String(enough && !upToDate && !failure)}
    >
      {editable && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">{words.sentence}</span>
            <input
              value={state.sentence}
              maxLength={MOST_LETTERS}
              onChange={(event) =>
                update({ sentence: event.target.value.slice(0, MOST_LETTERS), focus: -1 })
              }
              className="rounded-control border border-hairline bg-paper px-3 py-2 text-base"
            />
          </label>
          {hasUnreadWords(state.sentence) && (
            <p className="text-sm text-ink-soft">{words.unread}</p>
          )}
          {notExample && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              {reading && upToDate && itLooksAt(reading) === null && (
                <span>{words.guessNeedsExample}</span>
              )}
              <button
                type="button"
                onClick={() => update({ sentence: words.example, focus: 8 })}
                className={BUTTON}
              >
                {words.bringBack}
              </button>
            </div>
          )}
        </div>
      )}
      {!editable && <p className="text-sm text-ink-soft">{words.showing(showing)}</p>}
      {!enough ? (
        <p className="py-16 text-center text-ink-soft">{words.fewWords}</p>
      ) : failure ? (
        <div
          role="alert"
          data-failure={failure}
          className="flex flex-col items-start gap-3 rounded-card border border-hairline bg-card p-4"
        >
          <p>{failure === "load" ? words.failed : words.unreadable}</p>
          <button type="button" onClick={retry} className={`${BUTTON} text-accent-ink`}>
            {words.retry}
          </button>
        </div>
      ) : threads ? (
        <div className="relative">
          <div className={upToDate ? "" : "opacity-40 transition-opacity"}>
            {state.gallery && editable && reading ? (
              <ReaderGallery
                reading={reading}
                depth={state.depth}
                habits={frame?.habits ?? []}
                onPick={(reader) => update({ reader, gallery: false })}
              />
            ) : (
              <ThreadView
                threads={threads}
                focus={state.focus}
                onFocus={(focus) => update({ focus })}
                onMove={
                  // Moving words is held back until the reading matches what was just typed.
                  editable && upToDate
                    ? (from, to) =>
                        update(({ focus, sentence }) => ({
                          sentence: moveWord(sentence, from, to),
                          focus: focusAfterMove(focus, from, to),
                        }))
                    : undefined
                }
              />
            )}
          </div>
          {!upToDate && (
            <p aria-hidden className="absolute inset-x-0 top-4 text-center text-sm text-ink-soft">
              {words.reading}
            </p>
          )}
        </div>
      ) : (
        <Waking sentence={asked} progress={progress} />
      )}
      {threads && editable && !state.gallery && (
        <div className="flex flex-col gap-1 text-sm text-ink-soft">
          <p>{words.dragHint}</p>
        </div>
      )}
    </div>
  );
}

/** While the reader first arrives: a short animated intro and how far the download has got. */
function Waking({ sentence, progress }: { sentence: string; progress: number | null }) {
  const fraction = progress ?? 0;
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center" data-waking>
      <p className="font-serif text-lg">{words.waking}</p>
      <div aria-hidden className="flex max-w-full flex-wrap justify-center gap-2">
        {wordsOf(sentence).map((word, index) => (
          <span
            key={`${word}-${index}`}
            className="rounded-pill border border-hairline bg-card px-2.5 py-1 text-sm text-ink-soft motion-safe:animate-pulse"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {word}
          </span>
        ))}
      </div>
      <div
        role="progressbar"
        aria-label={words.progress.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuetext={words.progress.share(fraction)}
        data-progress={fraction.toFixed(2)}
        className="h-2 w-full max-w-xs overflow-hidden rounded-pill bg-sand"
      >
        <div
          className="h-full rounded-pill bg-ink-soft transition-[width] duration-300"
          style={{ width: `${Math.max(4, fraction * 100)}%` }}
        />
      </div>
      <p className="text-sm text-ink-soft">{words.progress.share(fraction)}</p>
      <p className="max-w-md text-sm text-ink-soft">{words.intro}</p>
    </div>
  );
}
