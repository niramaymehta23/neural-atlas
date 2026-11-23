"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { Timeline } from "@/engine/timeline/timeline";
import { CompareSplit } from "@/ui/CompareSplit";
import { PaperCard } from "@/ui/PaperCard";
import { StoryCaption } from "@/ui/StoryCaption";
import { TermTag } from "@/ui/TermTag";
import { Toggle } from "@/ui/Toggle";
import { UnderTheHoodDrawer } from "@/ui/UnderTheHoodDrawer";
import { platformCaptions } from "./captions";
import type { Lesson, LessonModule, Mission, ModuleState, TimelineFrame, Update } from "./contract";
import { LessonErrorBoundary } from "./LessonErrorBoundary";
import { MissionPanel } from "./MissionPanel";
import {
  createMissionWatcher,
  replayWindow,
  startReplay,
  type ReplayWindow,
} from "./missions/missions";
import { createModuleStore } from "./module-store";
import { PredictionSlot } from "./PredictionSlot";
import { progressStore, useProgress } from "./progress/progress";
import { SceneDescription } from "./SceneDescription";
import { ShareControl } from "./ShareControl";
import { SiteNav } from "./SiteNav";
import type { Snapshot } from "./snapshot/snapshot";
import { useRestoredMoment } from "./use-restored-moment";
import { useStageHeight } from "./use-stage-height";
import { TimelineBar } from "./TimelineBar";

type ModuleShellProps = {
  lesson: Pick<Lesson, "id" | "title" | "realTerm">;
  module: LessonModule;
  /** A view from a snapshot link, restored exactly (its guesses are shown as theirs). */
  restored?: Snapshot | null;
  /** Shows this mission first (the daily puzzle's) until it is done or another fires. */
  focusMission?: string | null;
  /** Where to start when there is no link (the learner's own network, through `initialFrom`). */
  initialState?: ModuleState;
  /** Offered once every mission here is done. */
  nextIdea?: { id: string; title: string } | null;
  /** Drops a restored link's view and starts afresh. */
  onStartOwn?: () => void;
};

type Fired = { mission: Mission<ModuleState>; window: ReplayWindow | null };
const ignore = () => undefined;
const NO_MISSIONS: readonly string[] = [];
const NO_GUESSES = {};

/** The URL without its snapshot (`s=`), keeping anything else in the hash (`mission=`). */
function withoutSnapshot(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has("s")) return null;
  params.delete("s");
  const rest = params.toString();
  return `${window.location.pathname}${window.location.search}${rest ? `#${rest}` : ""}`;
}

/**
 * The frame every lesson plugs into: site navigation, story opening, the scene with its
 * timeline and dials beside it, caption after the first touch, mission and prediction cards,
 * drawer, and the real term at the end. Each lesson part sits in its own error boundary.
 */
export function ModuleShell({
  lesson,
  module,
  restored,
  focusMission,
  initialState,
  nextIdea,
  onStartOwn,
}: ModuleShellProps) {
  const [store] = useState(() => {
    const created = createModuleStore(initialState ?? module.initialState);
    // The learner's own guesses start empty; the link's are shown beside them as theirs.
    if (restored) created.restore({ ...restored, guesses: {} });
    return created;
  });
  const [timeline] = useState(
    () => new Timeline<TimelineFrame>({ framesPerSecond: module.framesPerSecond }),
  );
  // The compare split's right half records into its own timeline, kept on the main one's moment.
  const [alternativeTimeline] = useState(
    () => new Timeline<TimelineFrame>({ framesPerSecond: module.framesPerSecond }),
  );
  const [watch] = useState(() => createMissionWatcher(module.missions));
  const state = useStore(store, (view) => view.state);
  const touched = useStore(store, (view) => view.touched);
  const guessed = useStore(store, (view) => Object.keys(view.guesses).length > 0);
  const doneMissions = useProgress(({ lessons }) => lessons[lesson.id]?.missions ?? NO_MISSIONS);
  const [queue, setQueue] = useState<readonly Fired[]>([]);
  const [everFired, setEverFired] = useState<ReadonlySet<string>>(new Set());
  const [replay, setReplay] = useState<ReplayWindow | null>(null);
  const [comparing, setComparing] = useState(false);
  const [skippedGuess, setSkippedGuess] = useState(false);
  // Where the card sits is settled when the lesson opens, so guessing does not move it (and
  // take the keyboard focus with it); only skipping sends it below the dials.
  const [askedFirst] = useState(() => !guessed);
  const [edits, setEdits] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  /** True while a restored link's view is untouched: missions it already meets earn nothing. */
  const restoring = useRef(Boolean(restored));
  const wasLive = useRef(false);
  const cancelRestoredMoment = useRestoredMoment(timeline, restored);
  const stage = useStageHeight<HTMLDivElement>();

  // A repeated message still changes the text, so screen readers say it again.
  const announce = useCallback(
    (message: string) => setAnnouncement((last) => (last === message ? `${message} ` : message)),
    [],
  );

  const update = useCallback<Update<ModuleState>>(
    (change, options) => {
      if (options?.touch !== false) {
        restoring.current = false;
        cancelRestoredMoment();
        const plain = withoutSnapshot();
        if (plain) window.history.replaceState(null, "", plain);
        setEdits((count) => count + 1);
      }
      store.update(change, options);
    },
    [store, cancelRestoredMoment],
  );

  useEffect(() => {
    void progressStore.recordVisit(lesson.id);
  }, [lesson.id]);

  // Missions are checked against the newest state and recorded moment, once saved progress is
  // known (so a mission finished on an earlier visit never fires again).
  useEffect(() => {
    const check = () => {
      const at = timeline.getState().length - 1;
      const frame = timeline.at(at);
      const { state } = store.getState();
      if (restoring.current) return watch.prime(state, frame);
      const done = new Set(progressStore.getState().lessons[lesson.id]?.missions);
      const fired = watch(state, frame, done);
      if (fired.length === 0) return;
      setQueue((waiting) => [
        ...waiting,
        ...fired.map((mission) => ({
          mission,
          window: replayWindow(timeline, at, mission.replay),
        })),
      ]);
      setEverFired((ids) => new Set([...ids, ...fired.map(({ id }) => id)]));
      announce(fired.map(({ success }) => `${success} ${platformCaptions.star}`).join(" "));
      for (const { id } of fired) void progressStore.recordMission(lesson.id, id);
    };
    const checkWhenReady = () => void progressStore.ready.then(check);
    const stopStore = store.subscribe(checkWhenReady);
    const stopTimeline = timeline.subscribe(checkWhenReady);
    checkWhenReady();
    return () => {
      stopStore();
      stopTimeline();
    };
  }, [lesson.id, store, timeline, watch, announce]);

  // While comparing, the right half shows the same moment as the left (or follows live).
  useEffect(() => {
    if (!comparing) return;
    const sync = () => {
      const shown = timeline.current();
      if (timeline.getState().live || !shown) {
        if (!alternativeTimeline.getState().live) alternativeTimeline.goLive();
      } else if (alternativeTimeline.current()?.epoch !== shown.epoch) {
        alternativeTimeline.scrub(shown.epoch);
      }
    };
    sync();
    const stopMain = timeline.subscribe(sync);
    const stopAlternative = alternativeTimeline.subscribe(sync);
    return () => {
      stopMain();
      stopAlternative();
    };
  }, [comparing, timeline, alternativeTimeline]);

  const endReplay = useCallback(
    (finished: boolean) => {
      setReplay(null);
      if (finished && wasLive.current) timeline.goLive();
    },
    [timeline],
  );
  const playReplay = (window: ReplayWindow) => {
    wasLive.current = timeline.getState().live;
    if (startReplay(timeline, window)) setReplay(window);
  };

  const isDone = (id: string) => doneMissions.includes(id) || everFired.has(id);
  const head = queue[0];
  const nextMission = module.missions.find(({ id }) => !isDone(id));
  const focused = module.missions.find(({ id }) => id === focusMission && !isDone(id));
  const mission = head?.mission ?? focused ?? nextMission ?? module.missions.at(-1);
  const allDone = module.missions.every(({ id }) => isDone(id));
  const viewProps = useMemo(
    () => ({ state, update, timeline, side: "main" as const }),
    [state, update, timeline],
  );
  const { scene: Scene, controls: Controls, underTheHood: UnderTheHood, captions } = module;
  const compare = module.compare &&
    captions.compare && { alternative: module.compare, ...captions.compare };
  const guessFirst = !restored && !guessed && !skippedGuess;
  const cardOnTop = !restored && askedFirst && !skippedGuess;
  const predictionSlot = (
    <PredictionSlot
      predictions={module.predictions}
      store={store}
      timeline={timeline}
      theirs={restored?.guesses ?? NO_GUESSES}
      announce={announce}
      onRevealed={() => void progressStore.recordPrediction(lesson.id)}
      onSkip={guessFirst ? () => setSkippedGuess(true) : undefined}
    />
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 [overflow-anchor:none] md:px-6">
      <SiteNav current="lesson" />
      <header className="flex flex-col gap-3">
        <h1 tabIndex={-1} className="text-4xl leading-tight outline-none md:text-5xl">
          {lesson.title}
        </h1>
        <p className="max-w-prose text-lg text-ink-soft">{captions.opening}</p>
        {restored && onStartOwn && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <p>{platformCaptions.link.theirs}</p>
            <button
              type="button"
              onClick={onStartOwn}
              className="min-h-11 text-accent-ink underline-offset-4 hover:underline md:min-h-0"
            >
              {platformCaptions.link.startOwn}
            </button>
          </div>
        )}
        <ShareControl
          key={edits}
          lessonId={lesson.id}
          store={store}
          timeline={timeline}
          announce={announce}
        />
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        {/* On a phone the stage stays pinned by its lower part while the dials scroll beneath. */}
        <div
          ref={stage}
          data-region="stage"
          className="flex min-w-0 flex-col gap-3 max-md:min-h-(--stage-min) max-md:sticky max-md:top-[min(0px,calc(60dvh_-_var(--stage-h,0px)))] max-md:z-10 max-md:bg-paper max-md:pb-2"
        >
          <section
            aria-label={platformCaptions.scene}
            data-region="scene"
            className="flex min-h-80 flex-col gap-4 rounded-card border border-hairline bg-card p-4"
          >
            <LessonErrorBoundary className="min-h-72">
              {compare && comparing ? (
                <CompareSplit
                  label={compare.label}
                  leftLabel={compare.leftLabel}
                  rightLabel={compare.rightLabel}
                  className="min-h-80 grow"
                  left={<Scene {...viewProps} />}
                  right={
                    <Scene
                      state={compare.alternative(state)}
                      update={ignore}
                      timeline={alternativeTimeline}
                      side="alternative"
                    />
                  }
                />
              ) : (
                <Scene {...viewProps} />
              )}
            </LessonErrorBoundary>
            {compare && (
              <Toggle
                label={platformCaptions.compare}
                checked={comparing}
                onChange={setComparing}
              />
            )}
          </section>
          {module.trains && (
            <TimelineBar timeline={timeline} replay={replay} onReplayEnd={endReplay} />
          )}
        </div>

        <aside
          aria-label={platformCaptions.dials}
          data-region="dock"
          className="flex min-w-0 flex-col gap-4"
        >
          {cardOnTop && predictionSlot}
          <LessonErrorBoundary>
            <PaperCard className="flex flex-wrap justify-center gap-6">
              <Controls {...viewProps} />
            </PaperCard>
          </LessonErrorBoundary>
          {mission && (
            <MissionPanel
              mission={mission}
              done={isDone(mission.id)}
              justFired={head !== undefined}
              timeline={timeline}
              replay={module.trains ? (head?.window ?? null) : null}
              onReplay={playReplay}
              onNext={
                head && (queue.length > 1 || nextMission)
                  ? () => setQueue((waiting) => waiting.slice(1))
                  : undefined
              }
              nextIdea={allDone ? nextIdea : null}
            />
          )}
          {!cardOnTop && predictionSlot}
        </aside>
      </div>

      <div data-region="caption" className="flex min-h-12 flex-col items-start gap-3">
        <StoryCaption shown={touched}>{captions.story}</StoryCaption>
        {doneMissions.length > 0 || everFired.size > 0 ? <TermTag term={lesson.realTerm} /> : null}
      </div>

      {UnderTheHood && (
        <LessonErrorBoundary>
          <UnderTheHoodDrawer>
            <UnderTheHood {...viewProps} />
          </UnderTheHoodDrawer>
        </LessonErrorBoundary>
      )}

      <p role="status" data-announcer className="sr-only">
        {announcement}
      </p>
      {module.describe && (
        <SceneDescription describe={module.describe} store={store} timeline={timeline} />
      )}
    </main>
  );
}
