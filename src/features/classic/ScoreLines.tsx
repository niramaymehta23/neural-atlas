"use client";

import { outOf } from "@/design/copy";

type ScoreLinesProps = {
  /** Share right on the dots it learned from, 0–1. */
  own: number;
  /** Share right on new dots it never saw, 0–1; null when there are none (an own garden). */
  fresh: number | null;
  words: { own: string; fresh: string; none: string };
};

function Line({ name, share }: { name: string; share: number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-3">
        <span>{name}</span>
        <span className="text-ink-soft">{share === null ? "" : outOf(share)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill border border-ink-soft bg-paper">
        <div className="h-full bg-ink" style={{ width: `${Math.round((share ?? 0) * 100)}%` }} />
      </div>
    </div>
  );
}

/**
 * How it does on the dots it learned from and on new ones: two plain lines with bars, so
 * cramming (all right on its own dots, worse on new ones) can be seen. Fixed height.
 */
export function ScoreLines({ own, fresh, words }: ScoreLinesProps) {
  return (
    <div className="flex min-h-24 flex-col gap-2 text-sm" data-scores>
      <Line name={words.own} share={own} />
      {fresh === null ? (
        <p className="text-ink-soft">{words.none}</p>
      ) : (
        <Line name={words.fresh} share={fresh} />
      )}
    </div>
  );
}
