"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/design/motion";
import { canDrop, fromMoves, type Board } from "@/engine/rl/connect-four";
import type { Branch } from "@/engine/rl/mcts";
import type { ModuleViewProps } from "@/platform/contract";
import { Bloom } from "./Bloom";
import { Disc } from "./Disc";
import { FourBoard } from "./FourBoard";
import { words } from "./captions";
import {
  IT,
  isItsTurn,
  isPuzzle,
  isYourTurn,
  keyOf,
  ONE_MOVE_AHEAD,
  placeOf,
  PUZZLE,
  settingsOf,
  startsWithPuzzle,
  thinkingAt,
  YOU,
  type AheadFrame,
  type AheadState,
} from "./model";
import { useThinking, type Thinking } from "./use-thinking";

type Props = ModuleViewProps<AheadState, AheadFrame>;

/** A short beat between deciding and dropping, so you see its pick land (reduced motion: none). */
export const MOVE_BEAT_MS = 450;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0";

/** The most imagined of its moves, if it has imagined any. */
export function favouriteOf(branches: readonly Branch[]): Branch | undefined {
  let best: Branch | undefined;
  for (const branch of branches) if (!best || branch.visits > best.visits) best = branch;
  return best && best.visits > 0 ? best : undefined;
}

const topShareOf = (thinking: Thinking | null) => {
  const top = thinking ? favouriteOf(thinking.bloom) : undefined;
  const total = thinking?.bloom.reduce((sum, branch) => sum + branch.visits, 0) ?? 0;
  return top && total > 0 ? top.visits / total : 0;
};

function statusOf(board: Board, thinking: Thinking | null, note: "wait" | "full" | null) {
  if (board.outcome === YOU) return words.status.youWon;
  if (board.outcome === "draw") return words.status.draw;
  if (board.outcome !== 0) return words.status.itWon;
  if (note) return words.status[note];
  if (isItsTurn(board)) return thinking?.finished ? words.status.choosing : words.status.thinking;
  return board.count === 0 ? words.status.start : words.status.yourTurn;
}

/** The board you play on, and beside it the tree of games it imagines before each move. */
export function AheadScene({ state, update, timeline, side }: Props) {
  const { moves, futures, length } = state;
  const reduced = useReducedMotion();
  const board = useMemo(() => fromMoves(moves), [moves]);
  const position = useMemo(() => thinkingAt(moves), [moves]);
  const key = keyOf(position, { futures, length });
  const settings = settingsOf({ futures, length });
  const thinking = useThinking(key, position, settings);
  const [note, setNote] = useState<{ at: number; says: "wait" | "full" } | null>(null);
  const shownNote = note && note.at === moves.length ? note.says : null;
  const finished = thinking?.finished ?? false;
  const pick = thinking?.pick ?? -1;
  const thinkingNow = !!position && position.length === moves.length;
  const topShare = topShareOf(thinking);

  // What is on screen, for the guess: each thinking is a run, recorded as it starts and ends.
  const frame = useMemo(
    () => ({
      key,
      finished,
      puzzle: isPuzzle(position),
      futures,
      topShare: finished ? topShare : 0,
      pick: finished ? pick : -1,
    }),
    [key, finished, position, futures, topShare, pick],
  );
  const recordedKey = useRef<string | null>(null);
  useEffect(() => {
    if (recordedKey.current !== frame.key) {
      recordedKey.current = frame.key;
      timeline.newRun();
    }
    timeline.record({ ...frame, epoch: frame.finished ? 1 : 0, loss: 0 });
  }, [frame, timeline]);

  // Its move, once it has finished thinking about the board as it is now.
  const ready = side === "main" && finished && thinkingNow && isItsTurn(board) && pick >= 0;
  useEffect(() => {
    if (!ready) return;
    const expected = moves.join(",");
    const timer = setTimeout(
      () =>
        update(
          (now) =>
            now.moves.join(",") === expected && canDrop(fromMoves(now.moves), pick)
              ? { moves: [...now.moves, pick] }
              : {},
          { touch: false },
        ),
      reduced ? 0 : MOVE_BEAT_MS,
    );
    return () => clearTimeout(timer);
  }, [ready, moves, pick, reduced, update]);

  const onColumn = (column: number) => {
    if (!isYourTurn(board)) {
      if (board.outcome === 0) setNote({ at: moves.length, says: "wait" });
      return;
    }
    if (!canDrop(board, column)) return setNote({ at: moves.length, says: "full" });
    setNote(null);
    update({ moves: [...moves, column] });
  };

  const favourite = thinking ? favouriteOf(thinking.bloom) : undefined;
  const lastPlayed = position && !thinkingNow ? moves[position.length] : undefined;
  const differs = finished && lastPlayed !== undefined && pick !== lastPlayed;
  const newest = moves.length > 0 ? (moves.at(-1) ?? null) : null;

  return (
    <div
      className="flex grow flex-col gap-4 md:flex-row"
      data-testid="thinking-ahead"
      data-moves={moves.join("")}
      data-thinking={thinking ? (finished ? "done" : "busy") : "none"}
      data-games={thinking?.done ?? 0}
    >
      <section className="flex min-w-0 flex-col gap-2 md:w-1/2">
        <FourBoard
          board={board}
          newest={newest}
          pick={finished && (thinkingNow || differs) ? pick : null}
          onColumn={side === "main" ? onColumn : undefined}
          open={isYourTurn(board)}
        />
        <p className="min-h-10 text-center text-sm" data-status>
          {statusOf(board, thinking, shownNote)}
        </p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <Disc player={YOU} x={6} y={6} r={5} />
            </svg>
            {words.you}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <Disc player={IT} x={6} y={6} r={5} />
            </svg>
            {words.it}
          </span>
        </div>
        {side === "main" && (
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={BUTTON} onClick={() => update({ moves: [] })}>
              {words.newGame}
            </button>
            <button
              type="button"
              className={BUTTON}
              data-puzzle
              onClick={() => update({ moves: [...PUZZLE] })}
            >
              {words.puzzle}
            </button>
          </div>
        )}
        <p className="min-h-10 text-sm text-ink-soft">
          {startsWithPuzzle(moves) ? words.puzzleNote : ""}
        </p>
      </section>
      <section className="flex min-w-0 flex-col gap-2 md:w-1/2" data-tree>
        <h3 className="font-serif text-base">
          {words.tree.title}
          {position && (
            <span className="ml-2 text-sm font-normal text-ink-soft">
              {thinkingNow ? words.tree.now : words.tree.last}
            </span>
          )}
        </h3>
        {position ? (
          <Bloom
            branches={thinking?.bloom ?? []}
            total={thinking?.total ?? 1}
            favourite={finished ? pick : -1}
            label={words.tree.picture}
          />
        ) : (
          <div className="flex aspect-[200/108] items-center justify-center rounded-card border border-dashed border-hairline p-4 text-center text-sm text-ink-soft">
            {words.tree.empty}
          </div>
        )}
        <div className="h-1.5 w-full rounded-pill bg-hairline" aria-hidden>
          <div
            className="h-full rounded-pill bg-ink-soft"
            style={{
              width: `${thinking && thinking.total > 0 ? Math.round((thinking.done / thinking.total) * 100) : 0}%`,
            }}
          />
        </div>
        <div className="flex min-h-20 flex-col gap-1 text-sm" data-favourite={favourite?.column}>
          {finished && favourite && (
            <p>
              {futures === ONE_MOVE_AHEAD
                ? words.tree.looked
                : words.tree.favourite(placeOf(favourite.column), favourite.winShare)}
            </p>
          )}
          {differs && <p className="text-ink-soft">{words.tree.differs}</p>}
        </div>
        <p className="text-xs text-ink-soft">{words.key.branch}</p>
      </section>
    </div>
  );
}
