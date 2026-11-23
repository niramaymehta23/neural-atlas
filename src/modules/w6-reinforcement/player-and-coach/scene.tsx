"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/design/motion";
import { isPlayable } from "@/engine/rl/mdp";
import { argmax } from "@/engine/rl/tiny-net";
import { boardGlow } from "@/features/rl/board-values";
import { PolicyArrows } from "@/features/rl/PolicyArrows";
import { useAgentPractice } from "@/features/rl/use-agent-practice";
import type { ModuleViewProps } from "@/platform/contract";
import { Board } from "@/visuals/Board";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  BATCHES_PER_SECOND,
  BOARD,
  chancesAt,
  configOf,
  frameOf,
  MOST_BATCHES,
  RANDOM_SCORE,
  runOf,
  SCORE_RANGE,
  type CoachFrame,
  type CoachState,
} from "./model";

type Props = ModuleViewProps<CoachState, CoachFrame>;

/** How long the puppy stays on each square of a try, and rests at its end. */
const MOVE_MS = 160;
const REST_MS = 400;
const AWAY_MS = 120;
const NO_WALK: readonly number[] = [];
const NO_VALUES: readonly number[] = BOARD.tiles.map(() => 0);
/** A batch that changed the player's habits this much fills the bar. */
const FULL_CHANGE = 1.5;

/**
 * The square the puppy stands on: it walks one of the player's tries square by square, rests at
 * its end, leaves the board for a moment (so it never glides across walls back to the start) and
 * walks the newest try. Null while it is off the board. Reduced motion shows where the newest try
 * ended.
 */
function useWalker(walk: readonly number[]): number | null {
  const still = useReducedMotion();
  const [playing, setPlaying] = useState({ walk, at: 0 });
  useEffect(() => {
    if (still) return;
    const last = playing.walk.length - 1;
    if (playing.at < 0) {
      const timer = setTimeout(() => setPlaying((now) => ({ ...now, at: 0 })), AWAY_MS);
      return () => clearTimeout(timer);
    }
    if (playing.at < last) {
      const timer = setTimeout(() => setPlaying((now) => ({ ...now, at: now.at + 1 })), MOVE_MS);
      return () => clearTimeout(timer);
    }
    if (playing.walk === walk) return;
    const timer = setTimeout(() => setPlaying({ walk, at: -1 }), REST_MS);
    return () => clearTimeout(timer);
  }, [still, playing, walk]);
  if (still) return walk.at(-1) ?? BOARD.start;
  return playing.at < 0 ? null : (playing.walk[playing.at] ?? BOARD.start);
}

const pieceAt = (cell: number) => ({
  row: Math.floor(cell / BOARD.columns),
  column: cell % BOARD.columns,
});

/** The player's arrows with the puppy walking a try, beside the coach's glow, over the score line. */
export function CoachScene(props: Props) {
  const { state, timeline } = props;
  const run = runOf(state);
  const failure = useAgentPractice({
    ...props,
    config: configOf(state),
    runKey: run,
    most: MOST_BATCHES,
    perSecond: BATCHES_PER_SECOND,
    toFrame: frameOf,
  });
  const { live, cursor } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const current = timeline.current();
  const frame = current?.run === run ? current : undefined;
  const puppy = useWalker(frame?.walk ?? NO_WALK);
  // A worker failure goes to the lesson's error boundary.
  if (failure) throw failure;
  const frames = timeline.frames().filter((recorded) => recorded.run === run);
  const ghost = timeline.ghostFrames();
  const batches = frame?.step ?? 0;
  const glow = boardGlow(frame?.values ?? NO_VALUES, BOARD.tiles, { scale: 1 });
  const clamp = (score: number) => Math.min(SCORE_RANGE.max, Math.max(SCORE_RANGE.min, score));
  const change = frame?.change ?? 0;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="player-and-coach"
      data-step={batches}
      data-score={frame ? frame.score.toFixed(3) : ""}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-1" data-side="player">
          <p className="font-serif text-lg">{words.player}</p>
          <Board
            columns={BOARD.columns}
            tiles={BOARD.tiles}
            label={words.playerBoard}
            piece={puppy === null ? undefined : pieceAt(puppy)}
            overlay={(square) => {
              if (!frame || !isPlayable(BOARD, square.index)) return null;
              const shares = chancesAt(frame, square.index);
              return <PolicyArrows square={square} shares={shares} best={argmax(shares)} />;
            }}
            className="mx-auto w-full max-w-64"
          />
          <p className="min-h-10 text-sm text-ink-soft">{words.playerNote}</p>
        </section>
        <section className="flex flex-col gap-1" data-side="coach">
          <p className="font-serif text-lg">{words.coach}</p>
          <Board
            columns={BOARD.columns}
            tiles={BOARD.tiles}
            label={words.coachBoard}
            floorTones={glow.floorTones}
            floorValues={glow.floorValues}
            className="mx-auto w-full max-w-64"
          />
          <p className="min-h-10 text-sm text-ink-soft">{words.coachNote}</p>
        </section>
      </div>
      <section className="flex min-h-16 flex-col gap-1 text-sm">
        <p>{frame ? words.score(frame.score) : ""}</p>
        <svg
          role="img"
          aria-label={words.changeLabel}
          viewBox="0 0 200 8"
          className="h-2 w-full max-w-64"
          data-change={change.toFixed(2)}
        >
          <rect width={200} height={8} rx={4} fill="var(--color-inset)" />
          <rect
            width={Math.min(1, change / FULL_CHANGE) * 200}
            height={8}
            rx={4}
            fill="var(--color-ink-soft)"
          />
        </svg>
        <p className="text-ink-soft">{frame && batches > 0 ? words.change(change) : ""}</p>
      </section>
      <div className="flex flex-col gap-1">
        <Chart
          series={[
            ...(ghost.length > 0
              ? [{ values: ghost.map((at) => clamp(at.score)), ghost: true }]
              : []),
            { values: frames.map((at) => clamp(at.score)) },
          ]}
          label={words.line}
          marker={live ? undefined : cursor}
          range={SCORE_RANGE}
          baseline={RANDOM_SCORE}
          className="h-20 w-full"
        />
        <p className="text-sm text-ink-soft">{words.lineNote}</p>
        <p className="min-h-5 text-sm">{words.batches(batches, batches >= MOST_BATCHES)}</p>
      </div>
    </div>
  );
}
