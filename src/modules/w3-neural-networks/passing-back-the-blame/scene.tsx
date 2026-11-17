"use client";

import { useSyncExternalStore } from "react";
import { DRY_SHARE, GradientRain } from "@/features/building/GradientRain";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { blameRun, keyOf, startShare, type BlameFrame, type BlameState } from "./model";

type Props = ModuleViewProps<BlameState, BlameFrame>;

const LITTLE = 0.2;

/** How much blame reaches the start, in words. */
export const reachWords = (frame: Pick<BlameFrame, "blame">) => {
  const share = startShare(frame);
  return share < DRY_SHARE
    ? words.reach.dry
    : share < LITTLE
      ? words.reach.little
      : words.reach.plenty;
};

/** The blame rain falling back through the stack of layers. */
export function BlameScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: blameRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  if (failure) throw failure;
  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="passing-back-the-blame"
      data-epoch={ours?.epoch ?? 0}
    >
      <div className="min-h-40">
        {ours ? (
          <GradientRain blame={ours.blame} words={words.rain} />
        ) : (
          <p className="text-sm text-ink-soft">{words.waiting}</p>
        )}
      </div>
      {/* A reserved line, so the page does not jump when the words change. */}
      <p className="min-h-10 text-sm" data-reach>
        {ours ? reachWords(ours) : ""}
      </p>
    </div>
  );
}
