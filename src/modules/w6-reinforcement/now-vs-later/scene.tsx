"use client";

import { useMemo } from "react";
import { MOVE_COUNT } from "@/engine/rl/gridworld";
import { isPlayable, moveValues } from "@/engine/rl/mdp";
import { useShownFrame } from "@/features/language/use-shown-frame";
import { PolicyArrows } from "@/features/rl/PolicyArrows";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type Square } from "@/visuals/Board";
import { words } from "./captions";
import {
  BOARD,
  COLUMNS,
  FAR,
  frameOf,
  NEAR,
  noPreference,
  START,
  workOut,
  type NowFrame,
  type NowState,
  type Worked,
} from "./model";
import { Telescope } from "./Telescope";

type Props = ModuleViewProps<NowState, NowFrame>;

/** Each square's favourite move, or −1 where every move is worth the same (no reason to move). */
function leansOf({ world, plan, rules }: Worked): number[] {
  return world.tiles.map((_, cell) =>
    isPlayable(world, cell) && !noPreference(moveValues(world, plan.values, cell, rules))
      ? (plan.policy[cell] ?? -1)
      : -1,
  );
}

/** Pieces of food heaped in a bowl, one per unit of its size, so size reads without colour. */
function Food({ square, pieces }: { square: Square; pieces: number }) {
  const middle = { x: square.x + square.size / 2, y: square.y + square.size / 2 + 4 };
  return (
    <g data-food={pieces}>
      {Array.from({ length: pieces }, (_, at) => {
        const ring = at === 0 ? 0 : at < 7 ? 1 : 2;
        const turn = ((at - (ring === 1 ? 1 : 7)) / (ring === 1 ? 6 : 3)) * Math.PI * 2;
        return (
          <circle
            key={at}
            cx={middle.x + (ring === 0 ? 0 : Math.cos(turn) * ring * 5.5)}
            cy={middle.y - 6 + (ring === 0 ? 0 : Math.sin(turn) * ring * 3.5)}
            r={2.6}
            fill="var(--color-sand)"
            stroke="var(--color-ink)"
            strokeWidth={0.8}
          />
        );
      })}
    </g>
  );
}

/** The board with the plan's arrows and route, and the telescope underneath. */
export function NowScene({ state, timeline }: Props) {
  const { care, prize } = state;
  const worked = useMemo(() => workOut({ care, prize }), [care, prize]);
  const frame = useMemo(() => frameOf(worked), [worked]);
  useShownFrame(timeline, frame);
  const leans = useMemo(() => leansOf(worked), [worked]);
  const route = useMemo(() => new Set(worked.path.slice(1)), [worked]);

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="now-vs-later"
      data-heads={worked.destination}
      data-route={worked.path.length - 1}
    >
      <Board
        columns={COLUMNS}
        tiles={BOARD}
        label={words.board}
        piece={{ row: Math.floor(START / COLUMNS), column: START % COLUMNS }}
        overlay={(square) => (
          <>
            {square.index === NEAR && <Food square={square} pieces={1} />}
            {square.index === FAR && <Food square={square} pieces={Math.round(prize)} />}
            <PolicyArrows
              square={square}
              shares={Array.from({ length: MOVE_COUNT }, (_, move) =>
                move === leans[square.index] ? 1 : 0,
              )}
              best={leans[square.index] ?? -1}
            />
            {route.has(square.index) && (
              <circle
                data-footprint
                cx={square.x + 9}
                cy={square.y + square.size - 9}
                r={3}
                fill="var(--color-ink-soft)"
              />
            )}
          </>
        )}
        className="mx-auto w-full max-w-lg"
      />
      <p className="min-h-6 text-sm font-semibold" data-heads-line>
        {words.heads[worked.destination]}
      </p>
      <Telescope state={state} heads={worked.destination} />
      <p className="text-xs text-ink-soft">{words.telescope.key}</p>
    </div>
  );
}
