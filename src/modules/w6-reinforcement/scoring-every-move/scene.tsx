"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { valueTone } from "@/design/encodings";
import { MOVE_COUNT, MOVES, type Tile } from "@/engine/rl/gridworld";
import { bestMove, createQRunner, squareValue, type QRunner } from "@/engine/rl/q-learning";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type Square } from "@/visuals/Board";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  COLUMNS,
  frameFor,
  movesPerSecond,
  settingsOf,
  START,
  worldOf,
  type ScoringFrame,
  type ScoringState,
} from "./model";

type Props = ModuleViewProps<ScoringState, ScoringFrame>;

const SEED = 11;
/** Never more than this many moves in one animation frame, so a slow device stays responsive. */
const MOST_MOVES_PER_FRAME = 400;
/** Tries averaged into each point of the reward line, so slips do not hide the trend. */
const SMOOTHING = 10;
/** A link replays at most this many tries, so a long session (or a strange link) cannot freeze the page. */
const MOST_REPLAYED = 2000;

/**
 * Plays the puppy on this thread: a handful of moves per animation frame, one timeline frame per
 * finished try. A shared link replays the tries it had made, on the board as it was shared.
 */
function usePuppy({ state, update, timeline, side }: Props) {
  const { tiles, attempt, playing, speed } = state;
  const settings = settingsOf(state);
  const { curiosity, learnRate, lookAhead } = settings;
  const [runner, setRunner] = useState<QRunner | null>(null);
  const [, setTick] = useState(0);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    const start = latest.current;
    const created = createQRunner(worldOf(start.tiles), settingsOf(start), SEED + attempt);
    timeline.newRun();
    let previous: ScoringFrame | undefined;
    while (created.episodes < Math.min(start.episodes, MOST_REPLAYED))
      for (const episode of created.advance(1)) {
        previous = frameFor(episode, created.q, start.tiles, previous);
        timeline.record(previous);
      }
    setRunner(created);
    return () => setRunner(null);
  }, [attempt, timeline]);

  useEffect(() => runner?.setWorld(worldOf(tiles)), [runner, tiles]);
  useEffect(
    () => runner?.configure({ curiosity, learnRate, lookAhead }),
    [runner, curiosity, learnRate, lookAhead],
  );

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
    let owed = 0;
    const loop = (now: number) => {
      owed += ((now - last) / 1000) * movesPerSecond(speed);
      last = now;
      const moves = Math.min(MOST_MOVES_PER_FRAME, Math.floor(owed));
      owed -= moves;
      const finished = runner.advance(moves);
      const board = latest.current.tiles;
      for (const episode of finished) {
        const previous = timeline.at(timeline.getState().length - 1);
        timeline.record(frameFor(episode, runner.q, board, previous));
      }
      if (finished.length > 0 && side === "main") update({ episodes: runner.episodes });
      setTick((tick) => tick + 1);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [runner, playing, speed, timeline, side, update]);

  return runner;
}

const smooth = (values: readonly number[]) =>
  values.map((_, index) => {
    const window = values.slice(Math.max(0, index - SMOOTHING + 1), index + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });

/** Four small wedges per square, longer for better moves, the best one in ink. */
function ScoreArrows({ q, square, tile }: { q: ArrayLike<number>; square: Square; tile: Tile }) {
  if (tile === "wall" || tile === "goal" || tile === "trap") return null;
  const scores = MOVES.map((_, move) => q[square.index * MOVE_COUNT + move] ?? 0);
  const low = Math.min(...scores);
  const high = Math.max(...scores);
  if (high - low < 1e-6) return null;
  const best = bestMove(q, square.index);
  const middle = { x: square.x + square.size / 2, y: square.y + square.size / 2 };
  return (
    <>
      {MOVES.map(([dRow, dColumn], move) => {
        const reach = 4 + (((scores[move] ?? low) - low) / (high - low)) * (square.size / 2 - 8);
        const tip = { x: middle.x + dColumn * reach, y: middle.y + dRow * reach };
        const side = { x: -dRow * 3, y: dColumn * 3 };
        return (
          <path
            key={move}
            data-arrow={move === best ? "best" : undefined}
            d={`M${middle.x + side.x} ${middle.y + side.y} L${tip.x} ${tip.y} L${middle.x - side.x} ${middle.y - side.y} Z`}
            fill={move === best ? "var(--color-ink)" : "var(--color-ink-soft)"}
            fillOpacity={move === best ? 0.85 : 0.35}
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
  const rewards = useMemo(
    () => smooth(timeline.frames().map(({ reward }) => reward)),
    // `length` changes whenever a try is recorded; the frames are read from the timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeline, length],
  );
  const tries = shown?.epoch ?? timeline.at(length - 1)?.epoch ?? 0;

  const paint = (index: number) => {
    if (index === START || state.tiles[index] === state.brush) return;
    update(({ tiles: now }) => ({
      tiles: now.map((tile, at) => (at === index ? state.brush : tile)),
    }));
  };

  return (
    <div className="flex grow flex-col gap-4" data-testid="scoring-every-move" data-tries={tries}>
      <Board
        columns={COLUMNS}
        tiles={tiles}
        label={words.board}
        piece={{ row: Math.floor(position / COLUMNS), column: position % COLUMNS }}
        floorTones={tiles.map((_, index) => valueTone(squareValue(q, index)))}
        overlay={(square) => (
          <ScoreArrows q={q} square={square} tile={tiles[square.index] ?? "floor"} />
        )}
        onPaint={side === "main" ? paint : undefined}
        className="mx-auto w-full max-w-lg"
      />
      <div className="flex flex-col gap-1">
        <Chart
          series={[{ values: rewards }]}
          label={words.rewards}
          marker={live ? undefined : cursor}
          className="h-20 w-full"
        />
        <p className="text-sm text-ink-soft">{words.tries(count(tries))}</p>
      </div>
    </div>
  );
}
