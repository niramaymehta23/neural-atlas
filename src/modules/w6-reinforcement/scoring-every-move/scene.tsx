"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { valueTone } from "@/design/encodings";
import { isEnd, MOVE_COUNT, MOVES, type Tile } from "@/engine/rl/gridworld";
import { bestMove, squareValue, type QRunner } from "@/engine/rl/q-learning";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type BoardWords, type Square } from "@/visuals/Board";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  bowlFor,
  COLUMNS,
  heat,
  movesPerSecond,
  replay,
  settingsOf,
  START,
  tryFrame,
  withEdit,
  worldOf,
  type ScoringFrame,
  type ScoringState,
} from "./model";

type Props = ModuleViewProps<ScoringState, ScoringFrame>;

/** Never more than this many moves in one animation frame, so a slow device stays responsive. */
const MOST_MOVES_PER_FRAME = 400;
/** Tries averaged into each point of the reward line, so slips do not hide the trend. */
const SMOOTHING = 10;
/** The lesson's saved progress is brought up to date at most this often while it plays (QL-12). */
export const SYNC_MS = 250;
/** A slip is shown as a skid only when moves are slow enough to see one. */
const SKID_BELOW = 20;
/** The reward line's fixed scale: falling in the lava to a good run home, with room either side. */
const REWARD_RANGE = { min: -1.5, max: 1.5 };
/** Squares whose four scores differ by less than this show no arrows (QL-09). */
export const ARROW_FROM = 0.01;

/**
 * Plays the puppy on this thread: a handful of moves per animation frame, one timeline frame per
 * finished try. A shared link replays its edit log to the move it was shared at.
 */
function usePuppy({ state, update, timeline, side }: Props) {
  const { tiles, attempt, playing, speed, curiosity, learnRate, lookAhead } = state;
  const [runner, setRunner] = useState<QRunner | null>(null);
  const [, setTick] = useState(0);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  // A fresh run, or a link's run replayed exactly.
  useEffect(() => {
    timeline.newRun();
    let previous: ScoringFrame | undefined;
    const created = replay(latest.current, (episode, played) => {
      previous = tryFrame(episode, played, previous);
      timeline.record(previous);
    });
    setRunner(created);
    return () => setRunner(null);
  }, [attempt, timeline]);

  // Every repaint and dial change reaches the learner, and is logged at the move it happened.
  useEffect(() => {
    if (!runner) return;
    runner.setWorld(worldOf(tiles));
    runner.configure(settingsOf({ curiosity, learnRate, lookAhead }));
    if (side !== "main") return;
    const { moves, episodes } = runner;
    update(
      (now) => {
        const log = withEdit(now.log, moves, now);
        return log === now.log ? {} : { log, moves: Math.max(now.moves, moves), episodes };
      },
      { touch: false },
    );
  }, [runner, tiles, curiosity, learnRate, lookAhead, side, update]);

  // Pressing play jumps back to now; a restored link that was playing keeps its saved moment.
  const wasPlaying = useRef(playing);
  useEffect(() => {
    if (playing && !wasPlaying.current) timeline.goLive();
    wasPlaying.current = playing;
  }, [playing, timeline]);

  useEffect(() => {
    if (!runner || !playing) return;
    let frame = 0;
    let last = performance.now();
    let synced = last;
    let owed = 0;
    let behind = false;
    const sync = () => {
      if (side !== "main" || !behind) return;
      behind = false;
      update({ moves: runner.moves, episodes: runner.episodes }, { touch: false });
    };
    const loop = (now: number) => {
      owed += ((now - last) / 1000) * movesPerSecond(speed);
      last = now;
      const moves = Math.min(MOST_MOVES_PER_FRAME, Math.floor(owed));
      owed -= moves;
      // One move at a time, so each try is recorded with the scores it ended on.
      for (let taken = 0; taken < moves; taken += 1)
        for (const episode of runner.advance(1)) {
          const previous = timeline.at(timeline.getState().length - 1);
          timeline.record(tryFrame(episode, runner, previous));
        }
      // Between moves nothing on screen changes, so there is nothing to draw again.
      if (moves > 0) {
        behind = true;
        setTick((tick) => tick + 1);
      }
      if (now - synced >= SYNC_MS) {
        synced = now;
        sync();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      sync(); // pausing saves exactly where it stopped
    };
  }, [runner, playing, speed, timeline, side, update]);

  return runner;
}

const BOARD_WORDS: BoardWords = {
  instructions: words.paint.instructions,
  square: (row, column, kind) =>
    words.paint.square(count(row), count(column), words.paint.kinds[kind]),
};

const smooth = (values: readonly number[]) =>
  values.map((_, index) => {
    const window = values.slice(Math.max(0, index - SMOOTHING + 1), index + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });

/** How far apart the best and worst move are on the square where they differ most. */
export function boardSpread(q: ArrayLike<number>, tiles: readonly Tile[]): number {
  let spread = 0;
  tiles.forEach((tile, cell) => {
    if (tile === "wall" || isEnd(tile)) return;
    const scores = MOVES.map((_, move) => q[cell * MOVE_COUNT + move] ?? 0);
    spread = Math.max(spread, Math.max(...scores) - Math.min(...scores));
  });
  return spread;
}

/**
 * Four small wedges per square, longer for better moves, the best one in ink. Lengths share one
 * scale across the board, so a square whose moves are nearly equal shows short, even wedges.
 */
function ScoreArrows({
  q,
  square,
  tile,
  spread,
}: {
  q: ArrayLike<number>;
  square: Square;
  tile: Tile;
  spread: number;
}) {
  if (tile === "wall" || isEnd(tile)) return null;
  const scores = MOVES.map((_, move) => q[square.index * MOVE_COUNT + move] ?? 0);
  const low = Math.min(...scores);
  const high = Math.max(...scores);
  if (high - low < ARROW_FROM || spread < ARROW_FROM) return null;
  const best = bestMove(q, square.index);
  const middle = { x: square.x + square.size / 2, y: square.y + square.size / 2 };
  return (
    <>
      {MOVES.map(([dRow, dColumn], move) => {
        const reach = 4 + (((scores[move] ?? low) - low) / spread) * (square.size / 2 - 8);
        const tip = { x: middle.x + dColumn * reach, y: middle.y + dRow * reach };
        const side = { x: -dRow * 3, y: dColumn * 3 };
        return (
          <path
            key={move}
            data-arrow={move === best ? "best" : "other"}
            data-reach={reach.toFixed(1)}
            d={`M${middle.x + side.x} ${middle.y + side.y} L${tip.x} ${tip.y} L${middle.x - side.x} ${middle.y - side.y} Z`}
            fill={move === best ? "var(--color-ink)" : "var(--color-ink-soft)"}
            fillOpacity={move === best ? 0.85 : 0.6}
          />
        );
      })}
    </>
  );
}

/** The kitchen board with the scores drawn on it, and how well each try went underneath. */
export function ScoringScene(props: Props) {
  const { state, update, timeline, side } = props;
  const runner = usePuppy(props);
  const { live, cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = live ? undefined : timeline.at(cursor);
  const q = shown?.q ?? runner?.q ?? new Float64Array(state.tiles.length * MOVE_COUNT);
  const tiles = shown?.tiles ?? state.tiles;
  const position = shown ? START : (runner?.position ?? START);
  // At most the timeline's 600 kept tries, so smoothing them each frame is cheap; `length`
  // (from the subscription above) re-renders this whenever a try is recorded.
  const rewards = smooth(timeline.frames().map(({ reward }) => reward)).map((value) =>
    Math.min(REWARD_RANGE.max, Math.max(REWARD_RANGE.min, value)),
  );
  const tries = shown?.epoch ?? timeline.at(length - 1)?.epoch ?? 0;
  const warmth = heat(tries);
  const spread = boardSpread(q, tiles);
  const bowl = bowlFor(tiles);
  const skid =
    live && state.playing && !!runner?.slipped && movesPerSecond(state.speed) < SKID_BELOW;

  const paint = (index: number) => {
    if (index === START || state.tiles[index] === state.brush) return;
    // Painting changes the board as it is now, so a scrubbed-back view jumps to now first.
    if (!timeline.getState().live) timeline.goLive();
    update(({ tiles: now }) => ({
      tiles: now.map((tile, at) => (at === index ? state.brush : tile)),
    }));
  };

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="scoring-every-move"
      data-tries={tries}
      data-heat={warmth.toFixed(2)}
    >
      <Board
        columns={COLUMNS}
        tiles={tiles}
        label={words.board}
        piece={{ row: Math.floor(position / COLUMNS), column: position % COLUMNS }}
        skid={skid}
        floorTones={tiles.map((_, index) => valueTone(squareValue(q, index) * warmth))}
        floorValues={tiles.map((_, index) => squareValue(q, index) * warmth)}
        overlay={(square) => (
          <ScoreArrows
            q={q}
            square={square}
            tile={tiles[square.index] ?? "floor"}
            spread={spread}
          />
        )}
        onPaint={side === "main" ? paint : undefined}
        words={BOARD_WORDS}
        className="mx-auto w-full max-w-lg"
      />
      {bowl !== "reachable" && (
        <p className="text-center text-sm" data-bowl={bowl}>
          {words.bowl[bowl]}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <Chart
          series={[{ values: rewards }]}
          label={words.rewards}
          marker={live ? undefined : cursor}
          range={REWARD_RANGE}
          baseline={0}
          className="h-20 w-full"
        />
        <p className="text-sm text-ink-soft">{words.rewardsNote}</p>
        <p className="text-sm text-ink-soft">{words.tries(tries)}</p>
      </div>
    </div>
  );
}
