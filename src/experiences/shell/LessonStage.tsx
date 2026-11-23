"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { lessonById } from "@/catalog";
import { Timeline } from "@/engine/timeline/timeline";
import { platformCaptions } from "@/platform/captions";
import type { Lesson, LessonModule, ModuleState, TimelineFrame, Update } from "@/platform/contract";
import { fetchedLesson, fetchLesson } from "@/platform/lesson-cache";
import { createModuleStore } from "@/platform/module-store";
import { SceneDescription } from "@/platform/SceneDescription";
import { TimelineBar } from "@/platform/TimelineBar";
import { IdeaCardButton } from "@/ui/glossary/idea-cards";
import { StoryCaption } from "@/ui/StoryCaption";
import { BUTTON, LINK } from "./buttons";
import { shellCaptions } from "./captions";
import { Workbench } from "./Workbench";

type LessonStageProps = {
  /** A lesson's catalog id. Mount it afresh (by key) for another lesson. */
  id: string;
  /** The learner touched the scene or a dial. */
  onTouch?: () => void;
};

/**
 * A lesson's own scene and dials, played inside another page: the same module, fetched through
 * the catalog and started afresh, with its story line and a link to the whole lesson.
 */
export function LessonStage({ id, onTouch }: LessonStageProps) {
  const lesson = lessonById(id);
  const [module, setModule] = useState<LessonModule | "failed" | null>(() =>
    typeof window === "undefined" ? null : (fetchedLesson(id) ?? null),
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!lesson) return;
    let current = true;
    fetchLesson(lesson).then(
      (loaded) => current && setModule(loaded),
      () => current && setModule("failed"),
    );
    return () => {
      current = false;
    };
  }, [lesson, attempt]);

  if (!lesson) return null;
  return (
    <div data-lesson={id} className="flex flex-col gap-4">
      {module === "failed" ? (
        <div role="alert" className="flex min-h-96 flex-col items-start justify-center gap-4">
          <p>{shellCaptions.lessonFailed}</p>
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              setModule(null);
              setAttempt((count) => count + 1);
            }}
          >
            {platformCaptions.problem.retry}
          </button>
        </div>
      ) : module ? (
        <Playing key={attempt} module={module} onTouch={onTouch} />
      ) : (
        <p role="status" className="grid min-h-96 place-items-center text-ink-soft">
          {shellCaptions.lessonLoading}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 text-sm">
        <IdeaCardButton about={id} />
        <Link href={`/learn/${id}`} className={`inline-flex min-h-11 items-center ${LINK}`}>
          {shellCaptions.openLesson(lesson.title)}
        </Link>
      </div>
    </div>
  );
}

/** Starts fetching a lesson's code, so the next stop is ready when it is reached. */
export function preloadLesson(lesson: Pick<Lesson, "id" | "load"> | undefined) {
  // A fetch that fails here is retried, and reported, by the stage itself.
  if (lesson?.load && !fetchedLesson(lesson.id)) void fetchLesson(lesson).catch(() => undefined);
}

const ignoreReplay = () => undefined;

function Playing({ module, onTouch }: { module: LessonModule; onTouch?: () => void }) {
  const [store] = useState(() => createModuleStore(module.initialState));
  const [timeline] = useState(
    () => new Timeline<TimelineFrame>({ framesPerSecond: module.framesPerSecond }),
  );
  const state = useStore(store, (view) => view.state);
  const touched = useStore(store, (view) => view.touched);
  const update = useCallback<Update<ModuleState>>(
    (change, options) => {
      store.update(change, options);
      if (options?.touch !== false) onTouch?.();
    },
    [store, onTouch],
  );
  const props = useMemo(
    () => ({ state, update, timeline, side: "main" as const }),
    [state, update, timeline],
  );
  const { scene: Scene, controls: Controls } = module;
  return (
    <>
      <Workbench
        stage={
          <>
            <div className="flex min-h-72 flex-col gap-4">
              <Scene {...props} />
            </div>
            {module.trains && (
              <TimelineBar timeline={timeline} replay={null} onReplayEnd={ignoreReplay} />
            )}
          </>
        }
        dock={
          <div className="flex flex-wrap justify-center gap-6 rounded-card border border-hairline bg-card p-6">
            <Controls {...props} />
          </div>
        }
      />
      <StoryCaption shown={touched}>{module.captions.story}</StoryCaption>
      {module.describe && (
        <SceneDescription describe={module.describe} store={store} timeline={timeline} />
      )}
    </>
  );
}
