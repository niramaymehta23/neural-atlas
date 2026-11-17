"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { count, sentenceStart } from "@/design/copy";
import { BrushPicker } from "@/features/classic/BrushPicker";
import { ClassicGarden, GardenOverlay } from "@/features/classic/ClassicGarden";
import { GardenPicker } from "@/features/classic/GardenPicker";
import { plantGarden } from "@/features/classic/garden";
import { paintWords } from "@/features/classic/paint-words";
import { ScoreLines } from "@/features/classic/ScoreLines";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  curves,
  FIELD,
  fieldAt,
  framesOf,
  GARDENS,
  runKeyOf,
  wrongness,
  type RelayFrame,
  type RelayState,
} from "./model";

type Props = ModuleViewProps<RelayState, RelayFrame>;

const PAINT = paintWords(words.paint);
/** A dot whose guess is this far from its group is guessed wrong. */
const WRONG = 0.5;
const CHART_RANGE = { min: 0.4, max: 1 };

/**
 * Puts the relay on the timeline, one moment per runner. New runners are added to the same run;
 * new nests or settings start a new run (the old one stays as the ghost), so a link rebuilds it.
 */
function useRecordedRelay({ state, timeline }: Props) {
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const recorded = useRef<{ key: string; upTo: number } | null>(null);
  const key = runKeyOf(state);
  const { runners } = state;
  useEffect(() => {
    const frames = framesOf(latest.current);
    const last = recorded.current;
    if (!last || last.key !== key || runners < last.upTo) {
      timeline.newRun();
      for (const frame of frames) timeline.record(frame);
    } else for (const frame of frames.slice(last.upTo + 1)) timeline.record(frame);
    timeline.goLive();
    recorded.current = { key, upTo: runners };
  }, [key, runners, timeline]);
}

/** The park with the team's guess, rings on the nests still wrong, and how it scores as runners join. */
export function RelayScene(props: Props) {
  const { state, update, timeline, side } = props;
  useRecordedRelay(props);
  const { live, cursor } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const main = side === "main";
  const { relay, own, fresh } = curves(state);
  const key = runKeyOf(state);
  const scrubbed = live ? undefined : timeline.at(cursor);
  const shown =
    scrubbed && scrubbed.run === key ? Math.min(scrubbed.epoch, state.runners) : state.runners;
  const empty = state.points.length === 0;
  const wrong = wrongness(relay, state.points, shown);
  const misses = wrong.filter((value) => value > WRONG).length;
  return (
    <div className="flex grow flex-col gap-3" data-testid="the-mistake-relay" data-shown={shown}>
      {main && (
        <GardenPicker
          label={words.start}
          options={GARDENS}
          value={state.garden}
          names={words.gardens}
          onPick={(garden) => update({ garden, points: plantGarden(garden), runners: 0 })}
        />
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ClassicGarden
          dots={state.points}
          onChange={(change) => update((now) => ({ points: change(now.points), runners: 0 }))}
          brush={state.brush}
          field={empty ? null : fieldAt(relay, shown)}
          resolution={FIELD}
          words={{ label: words.park, paint: PAINT, full: words.full }}
          editable={main}
          above={
            <GardenOverlay>
              {state.points.map((dot, index) => {
                const off = wrong[index] ?? 0;
                if (off <= WRONG) return null;
                return (
                  <circle
                    key={index}
                    data-wrong
                    cx={dot.x}
                    cy={dot.y}
                    r={0.04 + 0.05 * (off - WRONG) * 2}
                    fill="none"
                    stroke="var(--color-ink)"
                    strokeWidth={0.014}
                  />
                );
              })}
            </GardenOverlay>
          }
          footer={
            <p>
              {shown === 0
                ? words.noRunners
                : sentenceStart(words.runners(count(shown), shown === 1))}{" "}
              {empty ? "" : sentenceStart(words.wrong(count(misses), misses === 1))}
            </p>
          }
        />
        <div className="flex flex-col gap-4">
          {main && (
            <BrushPicker
              value={state.brush}
              onChange={(brush) => update({ brush })}
              words={words.brush}
            />
          )}
          <ScoreLines
            own={own[shown] ?? 0}
            fresh={fresh ? (fresh[shown] ?? 0) : null}
            words={words.scores}
          />
          <figure className="flex flex-col gap-1 text-xs text-ink-soft">
            <Chart
              label={words.chart}
              series={[
                { values: own.map((value) => Math.max(CHART_RANGE.min, value)) },
                ...(fresh
                  ? [
                      {
                        values: fresh.map((value) => Math.max(CHART_RANGE.min, value)),
                        ghost: true,
                      },
                    ]
                  : []),
              ]}
              range={CHART_RANGE}
              marker={shown}
              className="h-24 w-full"
            />
            <figcaption>
              <span className="block">{words.legend.own}</span>
              {fresh && <span className="block">{words.legend.fresh}</span>}
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
