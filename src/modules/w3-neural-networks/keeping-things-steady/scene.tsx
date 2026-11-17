"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { GradientRain } from "@/features/building/GradientRain";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { ActivationStrip, type StripWords } from "@/features/inside/ActivationStrip";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  isFinished,
  keyOf,
  outcomeOf,
  signalsAtEnd,
  signalsOf,
  steadyRun,
  type SteadyFrame,
  type SteadyState,
} from "./model";

type Props = ModuleViewProps<SteadyState, SteadyFrame>;

const STRIP_WORDS: StripWords = {
  ...words.strip,
  layer: (index) => words.strip.layer(count(index + 1)),
};

const RANGE = { min: -1, max: 1 };
/** Mistakes above this are drawn at the top of the chart. */
const CHART_TOP = 1.2;
/** Pure guessing between two kinds scores this. */
const GUESSING = Math.log(2);

/** How the newest run went, in one sentence. */
export function outcomeSentence(state: SteadyState, frame: SteadyFrame | undefined): string {
  if (state.runs === 0) return words.outcome.waiting;
  if (!isFinished(state, frame)) return words.outcome.practising;
  return words.outcome[outcomeOf(frame)];
}

/** The signals in every layer, the blame passed back, and the mistakes as it practises. */
export function SteadyScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: steadyRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const newest = timeline.at(length - 1);
  // The frame's own stack: the dials may have moved before the new run arrives.
  const stack = useMemo(() => {
    if (!shown) return null;
    const [layers = "0", , calm = "false"] = shown.key.split("|");
    return { layers: Number(layers), calm: calm === "true" };
  }, [shown]);
  const signals = useMemo(
    () => (shown && stack ? signalsOf(stack, shown.params) : []),
    [shown, stack],
  );
  const series = useMemo(() => {
    const clip = (value: number) => Math.min(CHART_TOP, value);
    const now = {
      values: timeline
        .frames()
        .slice(0, length)
        .map(({ loss }) => clip(loss)),
    };
    const before = timeline.ghostFrames();
    return before.length > 0
      ? [now, { values: before.map(({ loss }) => clip(loss)), ghost: true }]
      : [now];
  }, [timeline, length]);
  if (failure) throw failure;

  return (
    <div className="flex grow flex-col gap-3" data-testid="keeping-things-steady">
      <section className="flex flex-col gap-1" aria-label={words.stripTitle}>
        <h3 className="text-sm text-ink-soft">{words.stripTitle}</h3>
        <div className="min-h-24 overflow-x-auto" data-strip>
          {shown ? <ActivationStrip layers={signals} range={RANGE} words={STRIP_WORDS} /> : null}
        </div>
        {/* A reserved line, so the page does not jump when the words change. */}
        <p className="min-h-10 text-sm" data-signals>
          {shown && stack ? words.signals[signalsAtEnd(stack, shown.params)] : ""}
        </p>
      </section>
      <section className="flex flex-col gap-1" aria-label={words.rainTitle}>
        <h3 className="text-sm text-ink-soft">{words.rainTitle}</h3>
        <div className="min-h-24" data-rain>
          {shown ? <GradientRain blame={shown.blame} words={words.rain} /> : null}
        </div>
      </section>
      <p className="min-h-6 text-sm" data-outcome>
        {outcomeSentence(state, newest)}
      </p>
      <figure className="flex flex-col gap-1">
        <Chart
          series={series}
          label={words.chart}
          marker={shown ? cursor : undefined}
          range={{ min: 0, max: CHART_TOP }}
          baseline={GUESSING}
          className="h-20 w-full"
        />
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span>{words.chartKey.now}</span>
          {series.length > 1 && <span>{words.chartKey.ghost}</span>}
          <span>{words.chartKey.guessing}</span>
        </figcaption>
      </figure>
    </div>
  );
}
