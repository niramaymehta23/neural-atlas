"use client";

import { useMemo } from "react";
import { favourites, hasUnreadWords, readable, type Habit } from "@/engine/pretrained/attention";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  frameOf,
  lostSense,
  MOST_LETTERS,
  onReaders,
  READERS,
  shownThreads,
  type ReadersFrame,
  type ReadersState,
} from "./model";
import { useSentenceReading } from "./reading";

type Props = ModuleViewProps<ReadersState, ReadersFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";

export function habitName(habit: Habit | undefined, sentence: readonly string[]): string {
  if (!habit) return words.reader.around;
  if (habit.kind === "one") return words.reader.one(sentence[habit.word] ?? "");
  return words.reader[habit.kind];
}

/** The sentence, the twelve readers as switches, and the picture the readers still on make. */
export function ReadersScene({ state, update, timeline, side }: Props) {
  const { asked, enough, loaded, failed, retry } = useSentenceReading(state.sentence);
  const reading = loaded?.reading ?? null;
  const upToDate = loaded?.sentence === asked;
  const frame = useMemo(
    () => (reading && loaded ? frameOf(reading, { ...state, sentence: loaded.sentence }) : null),
    [reading, loaded, state],
  );
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const threads = reading ? shownThreads(reading, state) : null;
  const on = onReaders(state.off);
  const toggle = (at: number) =>
    update(({ off }) => ({
      off: off.includes(at) ? off.filter((reader) => reader !== at) : [...off, at],
    }));

  return (
    <div className="flex grow flex-col gap-3" data-testid="many-readers">
      {editable && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">{words.sentence}</span>
            <input
              value={state.sentence}
              maxLength={MOST_LETTERS}
              onChange={(event) => update({ sentence: event.target.value.slice(0, MOST_LETTERS) })}
              className="min-h-11 rounded-control border border-hairline bg-paper px-3 py-2 text-base"
            />
          </label>
          <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-ink-soft">
            {hasUnreadWords(state.sentence) && <span>{words.unread}</span>}
            {readable(state.sentence) !== readable(words.example) && (
              <button
                type="button"
                className={BUTTON}
                onClick={() => update({ sentence: words.example })}
              >
                {words.bringBack}
              </button>
            )}
          </div>
        </div>
      )}
      {!enough ? (
        <p className="min-h-72 py-16 text-center text-ink-soft">{words.fewWords}</p>
      ) : failed ? (
        <LanguageFileStatus
          loaded={{ status: "failed", retry }}
          words={words.model}
          className="min-h-72"
        />
      ) : !reading || !threads || !frame ? (
        <LanguageFileStatus
          loaded={{ status: "loading" }}
          words={words.model}
          className="min-h-72"
        />
      ) : (
        <div
          className={`flex flex-col gap-3 ${upToDate ? "" : "opacity-40"}`}
          data-ready={String(upToDate)}
        >
          <section className="flex flex-col gap-2">
            <p className="text-sm text-ink-soft">{words.gallery}</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: READERS }, (_, head) => {
                const at = head + 1;
                const isOn = !state.off.includes(at);
                const name = habitName(frame.habits[head], reading.words);
                return (
                  <li key={at}>
                    <button
                      type="button"
                      aria-pressed={isOn}
                      aria-label={words.readerLabel(at, name, isOn)}
                      disabled={!editable}
                      onClick={() => toggle(at)}
                      data-reader={at}
                      className={`flex min-h-16 w-full flex-col items-start gap-0.5 rounded-card border p-2 text-left text-xs ${
                        isOn
                          ? "border-2 border-ink bg-card"
                          : "border-dashed border-ink-soft bg-inset text-ink-soft line-through"
                      }`}
                    >
                      <span className="font-semibold no-underline">{at}</span>
                      <span>{isOn ? name : words.off}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BUTTON} onClick={() => update({ off: [] })}>
                  {words.allOn}
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() =>
                    update({ off: Array.from({ length: READERS }, (_, at) => at + 1) })
                  }
                >
                  {words.allOff}
                </button>
              </div>
            )}
          </section>
          <ol
            aria-label={words.picture}
            className="flex flex-col gap-1 rounded-card border border-hairline bg-paper p-3 text-sm"
            data-picture
          >
            {on.length === 0 ? (
              <li className="text-ink-soft">{words.noReaders}</li>
            ) : (
              threads.words.map((word, from) => {
                const to = favourites(threads, from)[0];
                return (
                  <li
                    key={`${word}-${from}`}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
                  >
                    <span className="truncate text-right">{word}</span>
                    <span aria-hidden className="text-ink-soft">
                      →
                    </span>
                    <span className="truncate font-semibold">
                      {to === undefined ? "" : threads.words[to]}
                    </span>
                  </li>
                );
              })
            )}
          </ol>
          <div
            className="flex min-h-12 flex-col text-sm"
            data-sense={frame.agree}
            data-lost={lostSense(frame) ? "" : undefined}
          >
            <p>{words.sense(frame.agree, frame.words)}</p>
            <p className="text-ink-soft">{lostSense(frame) ? words.lost : words.kept}</p>
          </div>
        </div>
      )}
    </div>
  );
}
