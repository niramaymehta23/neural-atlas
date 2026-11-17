"use client";

import { useSyncExternalStore } from "react";
import { useStore } from "zustand";
import type { Timeline } from "@/engine/timeline/timeline";
import type { LessonModule, TimelineFrame } from "./contract";
import type { ModuleStore } from "./module-store";

type SceneDescriptionProps = {
  describe: NonNullable<LessonModule["describe"]>;
  store: ModuleStore;
  timeline: Timeline<TimelineFrame>;
};

/** The scene in one plain sentence, read out politely when it changes (for visuals without text). */
export function SceneDescription({ describe, store, timeline }: SceneDescriptionProps) {
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const state = useStore(store, (view) => view.state);
  let sentence = "";
  try {
    sentence = describe(state, timeline.at(length - 1));
  } catch {
    sentence = "";
  }
  return (
    <p aria-live="polite" data-scene-description className="sr-only">
      {sentence}
    </p>
  );
}
