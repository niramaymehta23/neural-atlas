"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  dotsOf,
  framesOf,
  runKeyOf,
  settled,
  shownStep,
  steps,
  type GroupsFrame,
  type GroupsState,
} from "./model";

type Props = ModuleViewProps<GroupsState, GroupsFrame>;

const DOT = 0.028;
const MAGNET = 0.09;

/** Puts the run on the timeline, one moment per move; a new drop or new dots starts a new run. */
function useRecordedRun({ state, timeline }: Props) {
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const recorded = useRef<{ key: string; upTo: number } | null>(null);
  const key = runKeyOf(state);
  const upTo = shownStep(state);
  useEffect(() => {
    const frames = framesOf(latest.current);
    const last = recorded.current;
    if (!last || last.key !== key || upTo < last.upTo) {
      timeline.newRun();
      for (const frame of frames) timeline.record(frame);
    } else for (const frame of frames.slice(last.upTo + 1)) timeline.record(frame);
    timeline.goLive();
    recorded.current = { key, upTo };
  }, [key, upTo, timeline]);
}

/** The dots in their magnet's shape, the magnets, and how tight the groups are move by move. */
export function GroupsScene(props: Props) {
  const { state, timeline } = props;
  useRecordedRun(props);
  const { live, cursor } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const dots = dotsOf(state);
  const run = steps(state);
  const key = runKeyOf(state);
  const latest = shownStep(state);
  const scrubbed = live ? undefined : timeline.at(cursor);
  const shown = scrubbed && scrubbed.run === key ? Math.min(scrubbed.epoch, latest) : latest;
  const step = run[shown] ?? run[0];
  const centres = step?.centres ?? [];
  const lonely = centres.some((_, index) => !step?.groups.includes(index));
  const status =
    shown === 0
      ? words.dropped
      : shown === latest && settled(state)
        ? words.stopped
        : words.moved(count(shown), shown === 1);
  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="finding-natural-groups"
      data-shown={shown}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <figure className="flex flex-col gap-2">
          <svg
            viewBox="-1 -1 2 2"
            role="img"
            aria-label={words.board}
            className="aspect-square w-full rounded-card border border-hairline bg-paper"
          >
            {dots.map((dot, index) => {
              const group = step?.groups[index] ?? 0;
              return (
                <path
                  key={index}
                  d={markPath(classMark(group), dot.x, -dot.y, DOT)}
                  fill={classTone(group)}
                  stroke="var(--color-paper)"
                  strokeWidth={0.006}
                />
              );
            })}
            {centres.map((centre, index) => (
              <g key={index} data-magnet>
                <path
                  d={markPath(classMark(index), centre.x, -centre.y, MAGNET)}
                  fill="var(--color-paper)"
                  stroke="var(--color-ink)"
                  strokeWidth={0.05}
                />
                <path
                  d={markPath(classMark(index), centre.x, -centre.y, MAGNET)}
                  fill="none"
                  stroke={classTone(index)}
                  strokeWidth={0.025}
                />
              </g>
            ))}
          </svg>
          <figcaption className="min-h-12 text-sm">
            {status} {lonely ? words.empty : ""}
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-1 text-xs text-ink-soft">
          <Chart
            label={words.chart}
            series={[{ values: run.slice(0, latest + 1).map((moment) => moment.spread) }]}
            marker={shown}
            className="h-24 w-full"
          />
          <figcaption>{words.chart}</figcaption>
        </figure>
      </div>
    </div>
  );
}
