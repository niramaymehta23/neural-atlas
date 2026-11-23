"use client";

import type { Point } from "@/data/datasets";
import { MEND_GOAL, THREADS, type MendMoment } from "@/engine/lab/mend-run";
import { ClassicGarden } from "@/features/classic/ClassicGarden";
import { paintWords } from "@/features/classic/paint-words";
import { sandboxCaptions } from "../sandbox/captions";
import { twoPlayerCaptions as words } from "./captions";
import { CELLS, CUTS, HIDDEN, RESOLUTION, type TwoState } from "./model";
import { ScoreBar } from "./ScoreBar";
import { TeamThreads } from "./TeamThreads";

const PAINT = paintWords(sandboxCaptions.garden.paint);
const still = () => undefined;
const CELL_LIST = Array.from({ length: HIDDEN }, (_, cell) => cell);
const PICK =
  "min-h-11 min-w-11 rounded-control border border-hairline bg-card px-2 py-1 text-sm text-ink disabled:opacity-50 aria-pressed:border-2 aria-pressed:border-ink aria-pressed:font-medium";

/** Adds an item, or takes it back out; a full list takes no more. */
export function toggled(list: readonly number[], item: number, most: number): number[] {
  if (list.includes(item)) return list.filter((kept) => kept !== item);
  return list.length < most ? [...list, item] : [...list];
}

/** A cell's three threads, by number: in from across, in from up, and out. */
const threadsOf = (cell: number) => [cell * 2, cell * 2 + 1, HIDDEN * 2 + cell];

type Change = (change: Partial<TwoState>) => void;

export function CutPicker({ state, onPick }: { state: TwoState; onPick: Change }) {
  const left = CUTS - state.cuts.length;
  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="min-h-[2lh] text-sm text-ink-soft">
        {words.mend.break.note(left)}
      </p>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-1">
        {CELL_LIST.map((cell) => (
          <li key={cell} className="flex items-center gap-2">
            <span className="min-w-14 text-sm">{words.mend.break.cell(cell + 1)}</span>
            {threadsOf(cell).map((thread, which) => {
              const cut = state.cuts.includes(thread);
              const name = words.mend.break.threads[which] ?? "";
              return (
                <button
                  key={thread}
                  type="button"
                  className={PICK}
                  aria-pressed={cut}
                  disabled={!cut && left === 0}
                  aria-label={words.mend.break.thread(cell + 1, name, cut)}
                  onClick={() => onPick({ cuts: toggled(state.cuts, thread, CUTS) })}
                >
                  {cut ? `✕ ${name}` : name}
                </button>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CellPicker({ state, onPick }: { state: TwoState; onPick: Change }) {
  const left = CELLS - state.cells.length;
  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="min-h-[2lh] text-sm text-ink-soft">
        {words.mend.repair.note(left)}
      </p>
      <div className="flex flex-wrap gap-2">
        {CELL_LIST.map((cell) => {
          const picked = state.cells.includes(cell);
          return (
            <button
              key={cell}
              type="button"
              className={PICK}
              aria-pressed={picked}
              disabled={!picked && left === 0}
              onClick={() => onPick({ cells: toggled(state.cells, cell, CELLS) })}
            >
              {picked ? "✓ " : ""}
              {words.mend.repair.cell(cell + 1)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type MendStageProps = {
  state: TwoState;
  dots: readonly Point[];
  moment: MendMoment | null;
  onPick: Change;
};

/** The team and what it thinks of the garden, whole, broken or on the mend. */
export function MendStage({ state, dots, moment, onPick }: MendStageProps) {
  const { stage, cuts, cells } = state;
  const right = moment?.right ?? 0;
  const said = !moment
    ? ""
    : stage === "one"
      ? words.mend.whole(right)
      : moment.step === 0
        ? words.mend.broken(right)
        : words.mend.now(right);
  return (
    <div
      className={
        stage === "play" ? "grid items-center gap-6 md:grid-cols-2" : "flex flex-col gap-4"
      }
    >
      <TeamThreads
        params={moment?.params ?? null}
        cuts={cuts.filter((thread) => thread < THREADS)}
        cells={cells}
        label={words.mend.network}
        flowing={state.running}
        onThread={
          stage === "one" ? (thread) => onPick({ cuts: toggled(cuts, thread, CUTS) }) : undefined
        }
      />
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3" data-mend-right={right}>
        <ScoreBar right={right} goal={MEND_GOAL} label={words.mend.bar} />
        <p className="min-h-[2lh] text-sm">
          {said} {words.mend.goal(MEND_GOAL)}
        </p>
        <ClassicGarden
          dots={dots}
          onChange={still}
          brush={0}
          editable={false}
          field={moment?.field ?? null}
          resolution={RESOLUTION}
          words={{ label: words.mend.garden, paint: PAINT, full: sandboxCaptions.garden.full }}
        />
      </div>
    </div>
  );
}
