"use client";

import { useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { isEnd, MOVE_COUNT } from "@/engine/rl/gridworld";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { PolicyArrows } from "@/features/rl/PolicyArrows";
import type { ModuleViewProps } from "@/platform/contract";
import { Board, type Square } from "@/visuals/Board";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  BRIDGE,
  COLUMNS,
  EVERY,
  favourites,
  goneWild,
  habitRun,
  keyOf,
  START,
  WALKER_SUCCESS,
  type HabitFrame,
  type HabitState,
} from "./model";

type Props = ModuleViewProps<HabitState, HabitFrame>;

const EVEN = Array.from({ length: BRIDGE.length * MOVE_COUNT }, () => 1 / MOVE_COUNT);
const NO_FAVOURITES = BRIDGE.map(() => -1);

/** How often the latest tries reach the bowl, in words. */
export const reachedLine = (frame: Pick<HabitFrame, "recent">) => words.reached(frame.recent);

/** Small paw prints on the squares its latest try walked through. */
function Footprints({ square, path }: { square: Square; path: readonly number[] }) {
  if (square.index === START || !path.includes(square.index)) return null;
  const middle = { x: square.x + square.size / 2, y: square.y + square.size / 2 };
  return (
    <circle
      data-footprint
      cx={middle.x}
      cy={middle.y}
      r={3.5}
      fill="none"
      stroke="var(--color-ink)"
      strokeWidth={1.5}
      strokeDasharray="2 1.5"
    />
  );
}

/** The bridge with the puppy's habits drawn as arrows, how often it reaches the bowl, and its lucky try. */
export function HabitScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: habitRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  if (failure) throw failure;

  const chances = ours?.chances ?? EVEN;
  const best = ours ? favourites(chances) : NO_FAVOURITES;
  const path = ours?.path ?? [START];
  const at = path.at(-1) ?? START;
  const recents = ours
    ? timeline
        .frames()
        .filter((frame) => frame.key === ours.key)
        .map((frame) => frame.recent)
    : [];
  const wild = !!ours && goneWild(ours) && ours.tries > 0;

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="nudging-habits"
      data-tries={ours?.tries ?? 0}
      data-recent={ours ? Math.round(ours.recent * 100) : undefined}
      data-wild={wild ? "" : undefined}
    >
      <Board
        columns={COLUMNS}
        tiles={BRIDGE}
        label={words.board}
        piece={{ row: Math.floor(at / COLUMNS), column: at % COLUMNS }}
        overlay={(square) => (
          <>
            <Footprints square={square} path={ours ? path : []} />
            {!isEnd(BRIDGE[square.index]) && (
              <PolicyArrows
                square={square}
                shares={Array.from(
                  { length: MOVE_COUNT },
                  (_, move) => chances[square.index * MOVE_COUNT + move] ?? 0,
                )}
                best={best[square.index] ?? -1}
              />
            )}
          </>
        )}
        className="mx-auto w-full max-w-lg"
      />
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-28 flex-col gap-1 text-sm" data-status>
        {ours ? (
          <>
            <p>{words.tries(ours.tries)}</p>
            {ours.tries > 0 && (
              <p data-reached>
                {reachedLine(ours)} {words.lava(ours.lava)}
              </p>
            )}
            {ours.lucky && (
              <p data-lucky={ours.lucky.then}>
                {words.lucky[ours.lucky.then](count(ours.lucky.at))}
              </p>
            )}
            {wild && <p className="font-medium">{words.wild}</p>}
          </>
        ) : (
          <p>{words.waiting}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Chart
          series={[{ values: recents }]}
          label={words.chart}
          marker={ours ? Math.min(recents.length - 1, ours.tries / EVERY) : undefined}
          range={{ min: 0, max: 1 }}
          baseline={WALKER_SUCCESS}
          className="h-20 w-full"
        />
        <p className="text-sm text-ink-soft">{words.chartNote}</p>
      </div>
    </div>
  );
}
