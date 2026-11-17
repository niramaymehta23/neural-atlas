"use client";

import { count } from "@/design/copy";
import { DecisionField } from "@/data/DecisionField";
import { BrushPicker } from "@/features/classic/BrushPicker";
import { ClassicGarden } from "@/features/classic/ClassicGarden";
import { GardenPicker } from "@/features/classic/GardenPicker";
import { plantGarden } from "@/features/classic/garden";
import { paintWords } from "@/features/classic/paint-words";
import { ScoreLines } from "@/features/classic/ScoreLines";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  crowdField,
  crowdScores,
  FIELD,
  GARDENS,
  SHOWN_TREES,
  SMALL_FIELD,
  treeFields,
  type CrowdState,
} from "./model";

type Props = ModuleViewProps<CrowdState>;

const PAINT = paintWords(words.paint);

/** The park coloured by the crowd's vote, with a row of the little trees' own maps beside it. */
export function CrowdScene({ state, update, side }: Props) {
  const main = side === "main";
  const { forest, own, fresh } = crowdScores(state);
  const empty = state.points.length === 0;
  const small = empty ? [] : treeFields(forest);
  const hidden = Math.max(0, forest.length - SHOWN_TREES);
  return (
    <div className="flex grow flex-col gap-3" data-testid="wisdom-of-the-crowd">
      {main && (
        <GardenPicker
          label={words.start}
          options={GARDENS}
          value={state.garden}
          names={words.gardens}
          onPick={(garden) => update({ garden, points: plantGarden(garden) })}
        />
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ClassicGarden
          dots={state.points}
          onChange={(change) => update((now) => ({ points: change(now.points) }))}
          brush={state.brush}
          field={empty ? null : crowdField(forest)}
          resolution={FIELD}
          words={{ label: words.park, paint: PAINT, full: words.full }}
          editable={main}
        />
        <div className="flex flex-col gap-4">
          <figure className="flex flex-col gap-2" aria-label={words.crowd}>
            <ul className="grid grid-cols-3 gap-2" data-trees={forest.length}>
              {Array.from({ length: Math.min(SHOWN_TREES, forest.length) }, (_, index) => (
                <li key={index} className="flex flex-col items-center gap-1 text-xs text-ink-soft">
                  <div className="relative aspect-square w-full overflow-hidden rounded-control border border-hairline bg-paper">
                    <DecisionField
                      outputs={small[index] ?? null}
                      groups={2}
                      resolution={SMALL_FIELD}
                    />
                  </div>
                  <span>{words.tree(count(index + 1))}</span>
                </li>
              ))}
            </ul>
            <figcaption className="min-h-5 text-sm text-ink-soft">
              {hidden > 0 ? words.more(count(hidden)) : ""}
            </figcaption>
          </figure>
          {main && (
            <BrushPicker
              value={state.brush}
              onChange={(brush) => update({ brush })}
              words={words.brush}
            />
          )}
          <ScoreLines own={own} fresh={fresh} words={words.scores} />
        </div>
      </div>
    </div>
  );
}
