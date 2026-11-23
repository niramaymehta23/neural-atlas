"use client";

import { useMemo } from "react";
import { count } from "@/design/copy";
import { BOARD_AGENTS, type BoardMoment } from "@/engine/lab/board-run";
import { MOVE_COUNT } from "@/engine/rl/gridworld";
import { boardGlow, glowScale } from "@/features/rl/board-values";
import { painted } from "@/features/rl/boards";
import { PolicyArrows } from "@/features/rl/PolicyArrows";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Board, type BoardWords, type Square } from "@/visuals/Board";
import type { ExperienceView } from "../shell/use-experience";
import { sandboxCaptions as words } from "./captions";
import {
  afresh,
  BOARDS,
  boardTrouble,
  BRUSHES,
  COLUMNS,
  START,
  tilesOf,
  type SandboxState,
} from "./model";
import { useWalk } from "./use-walk";

type Props = ExperienceView<SandboxState>;

const BOARD_WORDS: BoardWords = {
  instructions: words.board.instructions,
  square: (row, column, kind) =>
    words.board.square(count(row), count(column), words.board.kinds[kind]),
};

/** A square with no more than this between its leanings shows no arrows: it has no opinion yet. */
const UNDECIDED = 0.02;

type StageProps = Props & { moment: BoardMoment | null; note: string };

/** The board: how good each square looks to the learner, which way it leans, and a try to watch. */
export function BoardStage({ state, update, moment, note }: StageProps) {
  const tiles = tilesOf(state);
  const at = useWalk(moment?.walk ?? null, START);
  const glow = useMemo(
    () => boardGlow(moment?.values ?? [], tiles, { scale: glowScale(moment?.values ?? []) }),
    [moment, tiles],
  );
  const trouble = boardTrouble(state);
  const overlay = ({ index, x, y, size }: Square) => {
    const tile = tiles[index];
    if (!moment || (tile !== "floor" && tile !== "coin")) return null;
    const shares = Array.from(
      moment.leanings.subarray(index * MOVE_COUNT, (index + 1) * MOVE_COUNT),
    );
    const most = Math.max(...shares);
    if (most - Math.min(...shares) < UNDECIDED) return null;
    return (
      <PolicyArrows square={{ index, x, y, size }} shares={shares} best={shares.indexOf(most)} />
    );
  };
  return (
    <div className="flex flex-col gap-3">
      <Board
        columns={COLUMNS}
        tiles={tiles}
        piece={{ row: Math.floor(at / COLUMNS), column: at % COLUMNS }}
        label={words.board.label(words.boards.names[state.board])}
        floorTones={glow.floorTones}
        floorValues={glow.floorValues}
        overlay={overlay}
        onPaint={(index) => {
          const next = painted(tiles, index, state.boardBrush, START);
          if (next) update(afresh({ board: "own" as const, tiles: next }));
        }}
        words={BOARD_WORDS}
        className="mx-auto w-full max-w-md"
      />
      <p className="min-h-[2lh] text-sm text-ink-soft" data-note>
        {trouble === "blocked"
          ? words.board.blocked
          : trouble === "no-goal"
            ? words.board.noGoal
            : note}
      </p>
      <p className="text-sm text-ink-soft">{words.board.key}</p>
    </div>
  );
}

export function BoardDials({ state, update }: Props) {
  return (
    <>
      <SegmentedControl
        label={words.boards.label}
        showLabel
        options={BOARDS.map((value) => ({ value, label: words.boards.names[value] }))}
        value={state.board}
        onChange={(board) => update(afresh({ board }))}
      />
      <SegmentedControl
        label={words.agents.label}
        showLabel
        options={BOARD_AGENTS.map((value) => ({ value, label: words.agents.names[value] }))}
        value={state.agent}
        onChange={(agent) => update(afresh({ agent }))}
      />
      <p className="min-h-[4lh] text-sm text-ink-soft">{words.agents.notes[state.agent]}</p>
      <SegmentedControl
        label={words.board.brush.label}
        showLabel
        options={BRUSHES.map((value) => ({ value, label: words.board.brush.names[value] }))}
        value={state.boardBrush}
        onChange={(boardBrush) => update({ boardBrush })}
      />
    </>
  );
}
