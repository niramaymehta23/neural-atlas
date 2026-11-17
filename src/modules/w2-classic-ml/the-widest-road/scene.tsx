"use client";

import { count, sentenceStart } from "@/design/copy";
import type { Point } from "@/data/datasets";
import { lampPosts } from "@/engine/ml/svm";
import { BrushPicker } from "@/features/classic/BrushPicker";
import { ClassicGarden, GardenOverlay } from "@/features/classic/ClassicGarden";
import { GardenPicker } from "@/features/classic/GardenPicker";
import { paintWords } from "@/features/classic/paint-words";
import type { ModuleViewProps } from "@/platform/contract";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { contour } from "./contour";
import {
  canBuild,
  CONTOUR,
  FIELD,
  fieldOfRoad,
  GARDENS,
  GROUNDS,
  plantVillages,
  pulledPost,
  roadOf,
  roadSamples,
  wrongSide,
  type RoadState,
} from "./model";

type Props = ModuleViewProps<RoadState>;

const PAINT = paintWords(words.paint);

/** The homes that went missing in a change (by identity, as the garden filters them out). */
const gone = (before: readonly Point[], after: readonly Point[]) => {
  const kept = new Set(after);
  return before.filter((point) => !kept.has(point));
};

/** What the last pull did, in a sentence (once there is a road to compare). */
function PullNote({ state }: { state: RoadState }) {
  const post = pulledPost(state);
  if (post === null) return null;
  return <span className="block">{post ? words.pulledPost : words.pulledPlain}</span>;
}

/** The valley: the road's middle and edges, its lamp posts ringed, and the lifted ground. */
export function RoadScene({ state, update, side }: Props) {
  const main = side === "main";
  const ready = canBuild(state.points);
  const road = ready ? roadOf(state) : null;
  const samples = road ? roadSamples(road) : null;
  const posts = road ? lampPosts(road) : [];
  const wrong = road ? wrongSide(road, state.points) : 0;
  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="the-widest-road"
      data-posts={posts.length}
    >
      {main && (
        <GardenPicker
          label={words.start}
          options={GARDENS}
          value={state.garden}
          names={words.gardens}
          onPick={(garden) => update({ garden, points: plantVillages(garden), pulled: null })}
        />
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ClassicGarden
          dots={state.points}
          onChange={(change) =>
            update((now) => {
              const points = change(now.points);
              const [first] = gone(now.points, points);
              return { points, pulled: first ?? null };
            })
          }
          brush={state.brush}
          field={road ? fieldOfRoad(road) : null}
          resolution={FIELD}
          words={{ label: words.valley, paint: PAINT, full: words.full }}
          editable={main}
          overlay={
            samples && (
              <GardenOverlay>
                <path
                  d={contour(samples, CONTOUR, 0)}
                  stroke="var(--color-ink)"
                  strokeWidth={0.02}
                  fill="none"
                  data-road="middle"
                />
                {[-1, 1].map((edge) => (
                  <path
                    key={edge}
                    d={contour(samples, CONTOUR, edge)}
                    stroke="var(--color-ink)"
                    strokeWidth={0.01}
                    strokeDasharray="0.04 0.03"
                    fill="none"
                    data-road="edge"
                  />
                ))}
              </GardenOverlay>
            )
          }
          above={
            road && (
              <GardenOverlay>
                {posts.map((index) => {
                  const post = road.dots[index];
                  return post ? (
                    <g key={index} data-post>
                      <circle
                        cx={post.x}
                        cy={post.y}
                        r={0.06}
                        fill="none"
                        stroke="var(--color-paper)"
                        strokeWidth={0.024}
                      />
                      <circle
                        cx={post.x}
                        cy={post.y}
                        r={0.06}
                        fill="none"
                        stroke="var(--color-ink)"
                        strokeWidth={0.012}
                      />
                    </g>
                  ) : null;
                })}
              </GardenOverlay>
            )
          }
          footer={
            <p>
              {road ? words.posts(count(posts.length), posts.length === 1) : words.needHomes}{" "}
              {road && wrong > 0 ? sentenceStart(words.wrong(count(wrong), wrong === 1)) : ""}
              <PullNote state={state} />
            </p>
          }
        />
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label={words.ground.label}
            showLabel
            vertical
            options={GROUNDS.map((ground) => ({ value: ground, label: words.ground[ground] }))}
            value={state.ground}
            onChange={(ground) => update({ ground })}
          />
          {main && (
            <BrushPicker
              value={state.brush}
              onChange={(brush) => update({ brush })}
              words={words.brush}
            />
          )}
        </div>
      </div>
    </div>
  );
}
