"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  EDGE,
  fixedEnding,
  height,
  isFinished,
  keyOf,
  nearestSweep,
  PARTS,
  planEnding,
  rollPlan,
  STEPS,
  SWEEP_ENDS,
  TOP,
  VIEWS,
  type PlanFrame,
  type PlanState,
} from "./model";
import { PlanBars } from "./plan-bars";

type Props = ModuleViewProps<PlanState, PlanFrame>;

const WIDTH = 400;
const HEIGHT = 200;
const PAD = 16;
const toX = (x: number) => PAD + ((x + EDGE) / (2 * EDGE)) * (WIDTH - 2 * PAD);
const toY = (h: number) => HEIGHT - PAD - (h / TOP) * (HEIGHT - 2 * PAD);
const CURVE = Array.from({ length: 81 }, (_, index) => {
  const x = -EDGE + (index / 80) * 2 * EDGE;
  return `${index === 0 ? "M" : "L"}${toX(x).toFixed(1)} ${toY(height(x)).toFixed(1)}`;
}).join(" ");
const BALL = 9;

/** How the walk on screen ended, in words. */
export function endingSentence(state: PlanState, frame: PlanFrame | undefined): string {
  if (state.runs === 0) return words.ending.waiting;
  if (!isFinished(state, frame)) return words.ending.walking;
  return words.ending[planEnding(state.plan)];
}

/** The valley from the side with the ball on its walk, and the plan of six step sizes. */
export function PlanScene(props: Props) {
  const { state, update, timeline, side } = props;
  const main = side === "main";
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: rollPlan,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length, hasGhost } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  if (failure) throw failure;
  const shown = timeline.at(cursor);
  const newest = timeline.at(length - 1);
  const ghost = hasGhost ? timeline.ghostFrames().at(-1) : undefined;
  return (
    <div className="flex grow flex-col gap-3" data-testid="big-steps-then-small">
      {main && (
        <SegmentedControl
          label={words.view.label}
          showLabel
          options={VIEWS.map((value) => ({ value, label: words.view[value] }))}
          value={state.view}
          onChange={(view) => update({ view }, { touch: false })}
        />
      )}
      {state.view === "sweep" && main ? (
        <Sweep first={state.plan[0] ?? 0} />
      ) : (
        <>
          <Valley timeline={timeline} cursor={cursor} length={length} shown={shown} ghost={ghost} />
          <PlanBars
            plan={state.plan}
            current={
              shown && shown.epoch > 0
                ? Math.min(PARTS - 1, Math.floor(((shown.epoch - 1) / STEPS) * PARTS))
                : null
            }
            onChange={
              main
                ? (part, bar) =>
                    update(({ plan }) => ({
                      plan: plan.map((old, index) => (index === part ? bar : old)),
                    }))
                : undefined
            }
          />
          {/* A reserved line, so the page does not jump when the words change. */}
          <p className="min-h-10 text-sm" data-ending>
            {endingSentence(state, newest)}
            {ghost && main ? <span className="text-ink-soft"> {words.ghost}</span> : null}
          </p>
        </>
      )}
    </div>
  );
}

function Valley({
  timeline,
  cursor,
  length,
  shown,
  ghost,
}: {
  timeline: Props["timeline"];
  cursor: number;
  length: number;
  shown: PlanFrame | undefined;
  ghost: PlanFrame | undefined;
}) {
  // `length` changes whenever a frame is recorded; the frames are read from the timeline.
  const trail = useMemo(
    () => timeline.frames().slice(0, Math.min(cursor, length - 1) + 1),
    [timeline, cursor, length],
  );
  const x = shown?.x ?? -1;
  return (
    <svg
      role="img"
      aria-label={words.valley}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full rounded-card border border-hairline bg-card"
      data-valley
    >
      <path
        d={`${CURVE} L${WIDTH - PAD} ${HEIGHT} L${PAD} ${HEIGHT} Z`}
        fill="var(--color-sand)"
        fillOpacity={0.5}
      />
      <path d={CURVE} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      {trail.map((frame) => (
        <circle
          key={frame.epoch}
          cx={toX(frame.x)}
          cy={toY(height(frame.x)) - BALL}
          r={2}
          fill="var(--color-ink-soft)"
        />
      ))}
      {ghost && (
        <circle
          cx={toX(ghost.x)}
          cy={toY(height(ghost.x)) - BALL}
          r={BALL}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          data-ghost
        />
      )}
      {!shown?.off && (
        <circle
          cx={toX(x)}
          cy={toY(height(x)) - BALL}
          r={BALL}
          fill="var(--color-accent)"
          stroke="var(--color-ink)"
          strokeWidth={1.5}
          data-ball={x.toFixed(3)}
        />
      )}
    </svg>
  );
}

/** The step-size sweep: one whole walk per fixed step size, and how low each one ends. */
function Sweep({ first }: { first: number }) {
  return (
    <div className="flex flex-col gap-2" data-sweep>
      <Chart
        series={[{ values: SWEEP_ENDS }]}
        label={words.sweep.chart}
        marker={nearestSweep(first)}
        range={{ min: 0, max: TOP }}
        className="h-40 w-full"
      />
      <p className="text-sm">{words.sweep.explain}</p>
      <p className="min-h-10 text-sm text-ink-soft">
        {words.sweep.marker} {words.sweep.yours[fixedEnding(first)]}
      </p>
    </div>
  );
}
