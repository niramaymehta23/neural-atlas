"use client";

import { useEffect, useMemo, useRef } from "react";
import { loadPieceSet } from "@/engine/language/files";
import type { Piece } from "@/engine/language/bpe";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import type { ModuleViewProps } from "@/platform/contract";
import { SAMPLES, words } from "./captions";
import {
  chop,
  costsMore,
  frameOf,
  MOST_LETTERS,
  type PiecesFrame,
  type PiecesState,
} from "./model";

type Props = ModuleViewProps<PiecesState, PiecesFrame>;

const SAMPLE_KEYS = ["english", "gujarati", "emoji", "code"] as const;
const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";

/** A piece as the learner sees it: spaces as dots, part of a letter as a diamond. */
export function shown(piece: Piece): string {
  if (piece.text === null) return "◇";
  return piece.text.replace(/ /g, "·").replace(/\n/g, "↵").replace(/\t/g, "→");
}

/** What the count says about the cost. */
export function costLine(frame: Pick<PiecesFrame, "pieces" | "letters">): string {
  const cost = words.cost(frame.pieces, frame.letters);
  if (costsMore(frame)) return `${cost} ${words.dearer}`;
  if (frame.pieces <= frame.letters * 0.6) return `${cost} ${words.cheaper}`;
  return `${cost} ${words.even}`;
}

/** The text box, ready-made texts, and the text cut into pieces with its cost. */
export function PiecesScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadPieceSet);
  const set = loaded.status === "ready" ? loaded.value : null;
  const pieces = useMemo(() => (set ? chop(set, state) : null), [set, state]);
  const recorded = useRef(0);

  // Every chopping shown is recorded, so the mission and the guess judge what is on screen.
  useEffect(() => {
    if (!set) return;
    recorded.current += 1;
    timeline.record(frameOf(set, state, recorded.current));
  }, [set, state, timeline]);

  const frame = set ? frameOf(set, state, 0) : null;
  const editable = side === "main";
  const hasPart = pieces?.some((piece) => piece.text === null) ?? false;
  const hasSpace = pieces?.some((piece) => piece.text?.includes(" ")) ?? false;

  return (
    <div className="flex grow flex-col gap-3" data-testid="chopping-text-into-pieces">
      <label className="flex flex-col gap-1 text-sm">
        <span>{words.box}</span>
        <textarea
          value={state.text}
          maxLength={MOST_LETTERS}
          rows={2}
          readOnly={!editable}
          onChange={(event) => update({ text: event.target.value.slice(0, MOST_LETTERS) })}
          className="min-h-16 w-full rounded-control border border-hairline bg-paper p-2 text-base"
        />
      </label>
      {editable && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{words.samples.label}</span>
          {SAMPLE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={BUTTON}
              data-sample={key}
              onClick={() => update({ text: SAMPLES[key] })}
            >
              {words.samples[key]}
            </button>
          ))}
        </div>
      )}
      {!set || !pieces || !frame ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-32"
        />
      ) : (
        <>
          <ol
            aria-label={words.picture}
            className="flex min-h-32 flex-wrap content-start gap-1 rounded-card border border-hairline bg-paper p-3"
            data-pieces={pieces.length}
          >
            {pieces.length === 0 && <li className="text-sm text-ink-soft">{words.empty}</li>}
            {pieces.map((piece, at) => (
              <li
                key={at}
                aria-label={words.pieceLabel(
                  at + 1,
                  piece.text === null ? words.partLabel : piece.text.trim() || shown(piece),
                )}
                data-part={piece.text === null ? "" : undefined}
                className={`rounded-inner border px-1.5 py-0.5 text-sm ${
                  at % 2 === 0
                    ? "border-ink-soft bg-card"
                    : "border-dashed border-ink-soft bg-inset"
                }`}
              >
                {shown(piece)}
              </li>
            ))}
          </ol>
          {/* Reserved lines, so the page does not jump when the words change. */}
          <div className="flex min-h-20 flex-col gap-1 text-sm">
            <p data-cost data-more={costsMore(frame) ? "" : undefined}>
              {frame.letters === 0 ? words.empty : costLine(frame)}
            </p>
            {hasSpace && <p className="text-ink-soft">{words.space}</p>}
            {hasPart && <p className="text-ink-soft">{words.part}</p>}
          </div>
        </>
      )}
    </div>
  );
}
