"use client";

import { count, outOf } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { applesOf, sortOf, type SortState } from "./model";

type Props = ModuleViewProps<SortState>;

type Box = "caught" | "falseAlarm" | "missed" | "clear";
const BOXES: readonly Box[] = ["caught", "falseAlarm", "missed", "clear"];

/** One apple: wormy ones are triangles, fine ones circles, so shape alone tells them apart. */
export function Apple({ wormy }: { wormy: boolean }) {
  const group = wormy ? 1 : 0;
  return (
    <svg viewBox="-1 -1 2 2" className="size-2.5 shrink-0" aria-hidden="true">
      <path d={markPath(classMark(group), 0, 0, 0.8)} fill={classTone(group)} />
    </svg>
  );
}

const boxOf = (yes: boolean, wormy: boolean): Box =>
  yes ? (wormy ? "caught" : "falseAlarm") : wormy ? "missed" : "clear";

/** The four boxes every apple lands in, and the three plain scores. */
export function SortScene({ state }: Props) {
  const { truth, scores } = applesOf(state.rare);
  const { counts, right, wormy, trust } = sortOf(state);
  const inBox = new Map<Box, boolean[]>(BOXES.map((box) => [box, []]));
  scores.forEach((score, index) => {
    const isWormy = truth[index] ?? false;
    inBox.get(boxOf(score >= state.threshold, isWormy))?.push(isWormy);
  });
  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="is-99-percent-actually-good"
      data-caught={counts.caught}
    >
      <section aria-label={words.board} className="grid grid-cols-2 gap-3">
        {BOXES.map((box) => (
          <div
            key={box}
            data-box={box}
            className={`flex h-36 flex-col gap-2 overflow-hidden rounded-card border bg-paper p-3 ${
              box === "caught" || box === "clear" ? "border-hairline" : "border-ink border-dashed"
            }`}
          >
            <h3 className="text-sm">{words.box(words.boxes[box], count(counts[box]))}</h3>
            <div className="flex flex-wrap content-start gap-0.5">
              {(inBox.get(box) ?? []).map((isWormy, index) => (
                <Apple key={index} wormy={isWormy} />
              ))}
            </div>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1">
          <Apple wormy /> {words.key.wormy}
        </span>
        <span className="flex items-center gap-1">
          <Apple wormy={false} /> {words.key.fine}
        </span>
      </div>
      <div className="flex min-h-20 flex-col gap-1 text-sm" data-scores>
        <p className="font-serif text-lg">{words.right(outOf(right))}</p>
        <p>{wormy === 0 ? words.noWorms : words.caught(count(counts.caught), count(wormy))}</p>
        <p className="text-ink-soft">
          {counts.caught + counts.falseAlarm === 0
            ? words.noneThrown
            : words.trusted(outOf(trust, { noun: "" }))}
        </p>
      </div>
    </div>
  );
}
