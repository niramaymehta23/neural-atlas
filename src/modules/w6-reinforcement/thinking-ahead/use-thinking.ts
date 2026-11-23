"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/design/motion";
import { fromMoves } from "@/engine/rl/connect-four";
import { createSearch, type Branch, type SearchSettings } from "@/engine/rl/mcts";
import { positionSeed } from "./model";

/** Work done between breaths, so a tap or key press is answered at once while it thinks. */
export const SLICE_MS = 6;
/** The bloom grows over about this long, however many games it imagines (reduced motion: at once). */
export const BLOOM_MS = 1200;
/** Games imagined between clock checks. */
const CHUNK = 8;
/** A breath between slices when it is ahead of the bloom's pace. */
const BREATH_MS = 16;

export type Thinking = {
  /** The position and dials this thinking is for: a view whose key differs is never shown. */
  key: string;
  done: number;
  total: number;
  finished: boolean;
  bloom: Branch[];
  /** Its pick once finished, else −1. */
  pick: number;
};

/**
 * Imagines the games for `moves` with `settings`, in slices of at most `SLICE_MS` paced so the
 * bloom grows over `BLOOM_MS`. A new position or a dial change throws the old search away and
 * starts a clean one: nothing from a half-finished search is ever counted in the new one.
 * The result depends only on the moves and the dials, never on how the work was sliced.
 */
export function useThinking(
  key: string,
  moves: readonly number[] | null,
  settings: SearchSettings,
): Thinking | null {
  const reduced = useReducedMotion();
  const [thinking, setThinking] = useState<Thinking | null>(null);
  const latest = useRef({ moves, settings });
  useEffect(() => {
    latest.current = { moves, settings };
  });

  useEffect(() => {
    const { moves: position, settings: dials } = latest.current;
    if (!position) return;
    const search = createSearch(fromMoves(position), dials, positionSeed(position));
    const started = performance.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const slice = () => {
      if (cancelled) return;
      const sliceStart = performance.now();
      const paced = reduced
        ? search.total
        : Math.ceil(search.total * Math.min(1, (sliceStart - started) / BLOOM_MS));
      while (search.done < paced && performance.now() - sliceStart < SLICE_MS)
        search.step(Math.min(CHUNK, paced - search.done));
      setThinking({
        key,
        done: search.done,
        total: search.total,
        finished: search.finished,
        bloom: search.bloom(),
        pick: search.finished ? search.choice() : -1,
      });
      if (!search.finished) timer = setTimeout(slice, search.done < paced ? 0 : BREATH_MS);
    };
    timer = setTimeout(slice, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` names the moves and dials (read from `latest`): a new key is a new search.
  }, [key, reduced]);

  return thinking && thinking.key === key ? thinking : null;
}
