"use client";

import { count } from "@/design/copy";
import { BrushPicker } from "@/features/classic/BrushPicker";
import { ClassicGarden, GardenOverlay } from "@/features/classic/ClassicGarden";
import { GardenPicker } from "@/features/classic/GardenPicker";
import { plantGarden } from "@/features/classic/garden";
import { paintWords } from "@/features/classic/paint-words";
import { ScoreLines } from "@/features/classic/ScoreLines";
import { cuts } from "@/engine/ml/tree";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { FIELD, fieldFor, GARDENS, scores, type QuestionsState } from "./model";

type Props = ModuleViewProps<QuestionsState>;

const PAINT = paintWords(words.paint);

/** The park, sliced by the tree's questions: earlier questions draw thicker lines. */
export function QuestionsScene({ state, update, side }: Props) {
  const main = side === "main";
  const { tree, own, fresh, boxes, asked } = scores(state);
  const lines = cuts(tree);
  return (
    <div className="flex grow flex-col gap-3" data-testid="twenty-questions" data-boxes={boxes}>
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
          field={state.points.length ? fieldFor(tree) : null}
          resolution={FIELD}
          words={{ label: words.park, paint: PAINT, full: words.full }}
          editable={main}
          overlay={
            <GardenOverlay>
              {lines.map((line, index) => (
                <line
                  key={index}
                  data-cut
                  x1={line.feature === 0 ? line.at : line.from}
                  x2={line.feature === 0 ? line.at : line.to}
                  y1={line.feature === 0 ? line.from : line.at}
                  y2={line.feature === 0 ? line.to : line.at}
                  stroke="var(--color-ink)"
                  strokeWidth={Math.max(0.006, 0.024 - line.depth * 0.004)}
                />
              ))}
            </GardenOverlay>
          }
          footer={<p>{words.boxes(count(asked), count(boxes), asked === 1, boxes === 1)}</p>}
        />
        <div className="flex flex-col gap-4">
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
