"use client";

import { useSyncExternalStore } from "react";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { slope, stepSize, type DownhillFrame, type DownhillState } from "./model";

const { drawer } = words;
const show = (value: number) => value.toFixed(2);

/**
 * The steady walker's rule with the numbers of the step on screen, following the timeline as
 * it plays or is dragged (DH-07).
 */
function LiveRule({ state, timeline }: ModuleViewProps<DownhillState, DownhillFrame>) {
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const now = timeline.at(cursor)?.walkers[0];
  const before = timeline.at(cursor - 1)?.walkers[0];
  if (!now || !before) return <p data-live-rule>{drawer.live.before}</p>;
  if (before.off) return <p data-live-rule>{drawer.live.off}</p>;
  const size = show(stepSize(state.step));
  const ground = slope(state.valley, before);
  return (
    <div data-live-rule className="flex flex-col gap-1 rounded-control bg-inset p-3">
      <p className="font-medium">{drawer.live.step(String(cursor))}</p>
      <p>{drawer.live.across(show(now.x), show(before.x), size, show(ground.x))}</p>
      <p>{drawer.live.along(show(now.z), show(before.z), size, show(ground.z))}</p>
      {now.off && <p>{drawer.live.off}</p>}
    </div>
  );
}

/** Mechanics and maths for the curious: how each walker steps, and why huge steps fly off. */
export function DownhillDrawer(props: ModuleViewProps<DownhillState, DownhillFrame>) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.steady}</p>
      <p>{drawer.rolling}</p>
      <p>{drawer.careful}</p>
      <h3 className="font-serif text-lg">{drawer.live.title}</h3>
      <LiveRule {...props} />
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.bound}</p>
    </div>
  );
}
