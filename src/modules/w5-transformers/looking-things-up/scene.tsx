"use client";

import { useMemo } from "react";
import { loadWordPlaces } from "@/engine/language/files";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { LIBRARY, QUESTIONS, words } from "./captions";
import { frameOf, MOST_LETTERS, wrongBook, type LookFrame, type LookState } from "./model";

type Props = ModuleViewProps<LookState, LookFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";

/** The question, the librarian's ranking of the books, the book handed over and the answer. */
export function LookScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadWordPlaces);
  const places = loaded.status === "ready" ? loaded.value : null;
  const frame = useMemo(() => (places ? frameOf(places, state) : null), [places, state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const used = frame ? LIBRARY[frame.used] : undefined;

  return (
    <div className="flex grow flex-col gap-3" data-testid="looking-things-up">
      <label className="flex flex-col gap-1 text-sm">
        <span>{words.question}</span>
        <input
          value={state.question}
          maxLength={MOST_LETTERS}
          readOnly={!editable}
          onChange={(event) =>
            update({ question: event.target.value.slice(0, MOST_LETTERS), handed: -1 })
          }
          className="min-h-11 rounded-control border border-hairline bg-paper px-3 py-2 text-base"
        />
      </label>
      {editable && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{words.questions}</span>
          {QUESTIONS.map(({ ask }) => (
            <button
              key={ask}
              type="button"
              className={BUTTON}
              onClick={() => update({ question: ask, handed: -1 })}
            >
              {ask}
            </button>
          ))}
        </div>
      )}
      {!places || !frame ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-80"
        />
      ) : (
        <div className="grid min-h-80 grid-cols-1 gap-3 md:grid-cols-2">
          <section className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">{words.librarian}</p>
            {frame.ranking.length === 0 ? (
              <p className="text-ink-soft">{words.unknown}</p>
            ) : (
              <ol className="flex flex-col gap-1" data-ranking>
                {frame.ranking.map(({ book, likeness }) => {
                  const title = LIBRARY[book]?.title ?? "";
                  const isUsed = book === frame.used;
                  return (
                    <li
                      key={book}
                      data-book={book}
                      data-used={isUsed ? "" : undefined}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-inner border px-2 py-1 ${isUsed ? "border-2 border-ink bg-card font-semibold" : "border-hairline"}`}
                    >
                      <span>
                        {title}{" "}
                        <span className="font-normal text-ink-soft">({words.match(likeness)})</span>
                      </span>
                      {editable && state.lookUp && !isUsed && (
                        <button
                          type="button"
                          className="min-h-11 text-xs text-accent-ink underline md:min-h-0"
                          onClick={() => update({ handed: book })}
                        >
                          {words.hand(title)}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {editable && state.handed >= 0 && (
              <button
                type="button"
                className={`${BUTTON} self-start`}
                onClick={() => update({ handed: -1 })}
              >
                {words.letLibrarian}
              </button>
            )}
          </section>
          <section
            className="flex flex-col gap-2 text-sm"
            data-wrong={wrongBook(frame) ? "" : undefined}
          >
            <p className="font-semibold">{words.answer}</p>
            {used ? (
              <>
                <p className="text-ink-soft">{words.handed(used.title)}</p>
                <p
                  aria-label={words.answerLabel(frame.answer)}
                  className="rounded-card border border-hairline bg-paper p-3 text-base"
                  data-answer
                >
                  {frame.answer}
                </p>
                <p className="min-h-10">
                  {wrongBook(frame)
                    ? words.wrongBook
                    : frame.truth === frame.used
                      ? words.rightBook
                      : ""}
                </p>
              </>
            ) : (
              <p
                className="rounded-card border border-dashed border-hairline bg-paper p-3"
                data-answer
              >
                {words.fromMemory}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
