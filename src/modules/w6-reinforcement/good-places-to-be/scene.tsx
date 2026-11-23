"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { MOVE_COUNT, reachability } from "@/engine/rl/gridworld";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { boardGlow } from "@/features/rl/board-values";
import { painted } from "@/features/rl/boards";
import { PolicyArrows } from "@/features/rl/PolicyArrows";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type BoardWords } from "@/visuals/Board";
import { words } from "./captions";
import {
  COLUMNS,
  glowRun,
  keyOf,
  leansAt,
  START,
  WARM,
  worldOf,
  type GlowFrame,
  type GlowState,
} from "./model";

type Props = ModuleViewProps<GlowState, GlowFrame>;

const BOARD_WORDS: BoardWords = {
  instructions: words.paint.instructions,
  square: (row, column, kind) =>
    words.paint.square(count(row), count(column), words.paint.kinds[kind]),
};

/** The garden glowing where it is good to be, one spread at a time along the timeline. */
export function GlowScene(props: Props) {
  const { state, update, timeline, side } = props;
  const { tiles, care, slippery } = state;
  const key = keyOf(state);
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: glowRun,
    settings: key,
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === key ? shown : undefined;
  const glow = useMemo(() => (ours ? boardGlow(ours.values, tiles) : null), [ours, tiles]);
  const leans = useMemo(
    () => (ours ? leansAt({ tiles, care, slippery }, ours.values) : null),
    [ours, tiles, care, slippery],
  );
  if (failure) throw failure;
  const bowl = reachability(worldOf(tiles));
  const cornerWarm = (ours?.values[START] ?? 0) >= WARM;

  const paint = (index: number) => {
    // Painting changes the board as it is now, so a scrubbed-back view jumps to now first.
    if (!timeline.getState().live) timeline.goLive();
    update(({ tiles: now, brush }) => {
      const next = painted(now, index, brush, START);
      return next ? { tiles: next } : {};
    });
  };

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="good-places-to-be"
      data-spread={ours?.epoch ?? -1}
      data-warm={ours?.warm ?? 0}
      data-settled={ours?.last ? "" : undefined}
      data-corner={cornerWarm ? "warm" : "cold"}
    >
      <Board
        columns={COLUMNS}
        tiles={tiles}
        label={side === "main" ? words.board : words.boardStill}
        piece={{ row: Math.floor(START / COLUMNS), column: START % COLUMNS }}
        floorTones={glow?.floorTones}
        floorValues={glow?.floorValues}
        overlay={(square) =>
          leans ? (
            <PolicyArrows
              square={square}
              shares={Array.from({ length: MOVE_COUNT }, (_, move) =>
                move === leans[square.index] ? 1 : 0,
              )}
              best={leans[square.index] ?? -1}
            />
          ) : null
        }
        onPaint={side === "main" ? paint : undefined}
        words={BOARD_WORDS}
        className="mx-auto w-full max-w-lg"
      />
      <div className="flex flex-col gap-1 text-sm">
        <p className="min-h-6 font-semibold" data-spreads>
          {ours ? words.spreads(ours.epoch) : state.runs === 0 ? words.waiting : words.working}
        </p>
        <p className="min-h-6" data-corner-line>
          {bowl !== "reachable"
            ? words.bowl[bowl]
            : ours
              ? cornerWarm
                ? words.corner.warm
                : words.corner.cold
              : ""}
        </p>
        <p className="min-h-10 text-ink-soft" data-settled-line>
          {ours?.last ? words.settled(ours.warm) : ""}
        </p>
      </div>
    </div>
  );
}
