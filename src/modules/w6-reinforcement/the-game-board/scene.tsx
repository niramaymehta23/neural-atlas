"use client";

import { useEffect, useMemo, useState } from "react";
import { count } from "@/design/copy";
import { useReducedMotion } from "@/design/motion";
import { reachability, type World } from "@/engine/rl/gridworld";
import type { Walk } from "@/engine/rl/mdp";
import { painted } from "@/features/rl/boards";
import { PolicyArrows } from "@/features/rl/PolicyArrows";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type BoardWords } from "@/visuals/Board";
import { words } from "./captions";
import {
  COLUMNS,
  frameOf,
  moveShares,
  START,
  TRAP_BELOW,
  walkOf,
  workOut,
  type BoardFrame,
  type BoardState,
  type Worked,
} from "./model";

type Props = ModuleViewProps<BoardState, BoardFrame>;

/** How long the puppy takes over each move of a walk, so slides can be seen. */
export const STEP_MS = 320;

const BOARD_WORDS: BoardWords = {
  instructions: words.paint.instructions,
  square: (row, column, kind) =>
    words.paint.square(count(row), count(column), words.paint.kinds[kind]),
};

/** One plain line about the plan's walk from the start (also what screen readers hear). */
export function tripLine(world: World, worked: Pick<Worked, "trip" | "home">): string {
  const bowl = reachability(world);
  if (bowl !== "reachable") return words.bowl[bowl];
  if (!Number.isFinite(worked.trip)) return words.trip.forever;
  if (worked.home < TRAP_BELOW) return words.trip.lava;
  return words.trip.home(Math.round(worked.trip));
}

/** What the newest walk did, in words. */
export function walkLine(walked: Walk): string {
  const moves = walked.path.length - 1;
  if (walked.end === "goal") return words.walk.goal(moves, walked.slips.filter(Boolean).length);
  if (walked.end === "trap") return words.walk.trap(moves, walked.slips.at(-1) === true);
  return words.walk.limit(moves);
}

/** Plays a walk one move at a time; reduced motion shows where it ended at once. */
function useWalkStep(walked: Walk | null) {
  const reduced = useReducedMotion();
  const last = walked ? walked.path.length - 1 : 0;
  const [step, setStep] = useState({ walked, at: reduced ? last : 0 });
  // A new walk starts again from the start square.
  if (step.walked !== walked) setStep({ walked, at: reduced ? last : 0 });
  const at = step.walked === walked ? step.at : 0;
  useEffect(() => {
    if (!walked || at >= last) return;
    const timer = setTimeout(() => setStep({ walked, at: at + 1 }), STEP_MS);
    return () => clearTimeout(timer);
  }, [walked, at, last]);
  return { at: reduced ? last : at, done: !walked || (reduced ? true : at >= last) };
}

/** The kitchen board with the best move on every square, trap squares and a walk to watch. */
export function GameBoardScene({ state, update, timeline, side }: Props) {
  const { tiles, slippery, tiring, walks } = state;
  const worked = useMemo(() => workOut({ tiles, slippery, tiring }), [tiles, slippery, tiring]);
  const frame = useMemo(() => frameOf(worked), [worked]);
  useShownFrame(timeline, frame);
  const walked = useMemo(() => walkOf(walks, worked), [walks, worked]);
  const { at, done } = useWalkStep(walked);
  const traps = useMemo(() => new Set(worked.traps), [worked]);
  const visited = useMemo(() => new Set(walked?.path.slice(0, at + 1)), [walked, at]);
  const position = walked?.path[at] ?? START;
  const skid = !done && at > 0 && walked?.slips[at - 1] === true;
  const aims = reachability(worked.world) !== "no-goal";

  const paint = (index: number) =>
    update(({ tiles: now, brush }) => {
      const next = painted(now, index, brush, START);
      return next ? { tiles: next } : {};
    });

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="the-game-board"
      data-traps={worked.traps.length}
      data-trip={Number.isFinite(worked.trip) ? worked.trip.toFixed(2) : "forever"}
      data-walk={walked ? `${walked.end}-${walked.path.length - 1}` : "none"}
    >
      <Board
        columns={COLUMNS}
        tiles={tiles}
        label={side === "main" ? words.board : words.boardStill}
        piece={{ row: Math.floor(position / COLUMNS), column: position % COLUMNS }}
        skid={skid}
        overlay={(square) => (
          <>
            {traps.has(square.index) && (
              <rect
                data-trap
                x={square.x + 3}
                y={square.y + 3}
                width={square.size - 6}
                height={square.size - 6}
                rx={8}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
            {aims && (
              <PolicyArrows
                square={square}
                shares={moveShares(worked.plan.policy[square.index] ?? -1, worked.rules.slip)}
                best={worked.plan.policy[square.index] ?? -1}
              />
            )}
            {walked && visited.has(square.index) && square.index !== position && (
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
        onPaint={side === "main" ? paint : undefined}
        words={BOARD_WORDS}
        className="mx-auto w-full max-w-lg"
      />
      <p className="text-xs text-ink-soft">{words.arrows}</p>
      <div className="flex flex-col gap-1 text-sm">
        <p className="min-h-10" data-trip-line>
          {tripLine(worked.world, worked)}
        </p>
        <p className="min-h-10" data-trap-line>
          {worked.traps.length > 0 ? words.traps.some : words.traps.none}
        </p>
        <p className="min-h-10 text-ink-soft" data-walk-line>
          {!walked ? words.walk.none : done ? walkLine(walked) : words.walk.walking}
        </p>
      </div>
    </div>
  );
}
