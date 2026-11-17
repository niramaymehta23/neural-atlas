"use client";

import { useId, useSyncExternalStore } from "react";
import { GroupMark } from "@/data/GroupMark";
import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { words } from "./captions";
import { canSplit, ERASER, keyOf, type SplitFrame, type SplitState } from "./model";

type Props = ModuleViewProps<SplitState, SplitFrame>;

const BRUSHES = [
  { value: "0", label: words.brush.daisies, icon: <GroupMark group={0} /> },
  { value: "1", label: words.brush.tulips, icon: <GroupMark group={1} /> },
  { value: String(ERASER), label: words.brush.pull },
] as const;
type Brush = (typeof BRUSHES)[number]["value"];

const describeStep = (value: number) =>
  value > 0.6 ? words.step.big : value > 0.15 ? words.step.small : words.step.tiny;
const describePractice = (value: number) =>
  value > 0.66 ? words.practice.long : value > 0.25 ? words.practice.medium : words.practice.short;

export function SplitControls({ state, update, timeline }: Props) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const newest = timeline.at(length - 1);
  const ready = canSplit(state.points);
  // Waiting for the fence these flowers and dials ask for (it comes once the dials rest).
  const working = state.runs > 0 && newest?.key !== keyOf(state);
  const hintId = useId();
  return (
    <>
      <Dial
        label={words.step.label}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={describeStep}
      />
      <Dial
        label={words.practice.label}
        value={state.practice}
        onChange={(practice) => update({ practice })}
        describe={describePractice}
      />
      <SegmentedControl
        label={words.brush.label}
        showLabel
        options={BRUSHES}
        value={String(state.brush) as Brush}
        onChange={(brush) => update({ brush: Number(brush) })}
      />
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={!ready || (working && ready)}
          aria-describedby={ready ? undefined : hintId}
          onClick={() => update(({ runs }) => ({ runs: runs + 1 }))}
          className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0"
        >
          {state.runs === 0 ? words.find : working && ready ? words.working : words.again}
        </button>
        {!ready && (
          <p id={hintId} className="text-sm text-ink-soft">
            {words.needBoth}
          </p>
        )}
      </div>
    </>
  );
}
