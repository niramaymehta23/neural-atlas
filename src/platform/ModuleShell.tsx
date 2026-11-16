"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { Timeline } from "@/engine/timeline/timeline";
import { CompareSplit } from "@/ui/CompareSplit";
import { PaperCard } from "@/ui/PaperCard";
import { StoryCaption } from "@/ui/StoryCaption";
import { TermTag } from "@/ui/TermTag";
import { Toggle } from "@/ui/Toggle";
import { UnderTheHoodDrawer } from "@/ui/UnderTheHoodDrawer";
import { platformCaptions } from "./captions";
import type { Lesson, LessonModule, Mission, ModuleState, TimelineFrame } from "./contract";
import { MissionPanel } from "./MissionPanel";
import {
  createMissionWatcher,
  replayWindow,
  startReplay,
  type ReplayWindow,
} from "./missions/missions";
import { createModuleStore } from "./module-store";
import { PredictionCard } from "./PredictionCard";
import { progressStore, useProgress } from "./progress/progress";
import { encodeSnapshot, hashFor, type Snapshot } from "./snapshot/snapshot";
import { TimelineBar } from "./TimelineBar";

type ModuleShellProps = {
  lesson: Pick<Lesson, "id" | "title" | "realTerm">;
  module: LessonModule;
  /** A view from a snapshot link, restored exactly. */
  restored?: Snapshot | null;
  /** Shows this mission first (the daily puzzle's). */
  focusMission?: string | null;
};

type Fired = { mission: Mission<ModuleState>; window: ReplayWindow | null };
const ignore = () => undefined;
const NO_MISSIONS: readonly string[] = [];

/**
 * The frame every lesson plugs into: story opening, scene with its dials beside it, caption after
 * the first touch, mission and prediction cards, timeline, drawer, and the real term at the end.
 */
export function ModuleShell({ lesson, module, restored, focusMission }: ModuleShellProps) {
  const [store] = useState(() => {
    const created = createModuleStore(module.initialState);
    if (restored) created.restore(restored);
    return created;
  });
  const [timeline] = useState(() => new Timeline<TimelineFrame>());
  // The compare split's right half records into its own timeline, which nobody sees.
  const [alternativeTimeline] = useState(() => new Timeline<TimelineFrame>());
  const [watch] = useState(() => createMissionWatcher(module.missions));
  const { state, touched, guesses } = useStore(store);
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const doneMissions = useProgress(({ lessons }) => lessons[lesson.id]?.missions ?? NO_MISSIONS);
  const [fired, setFired] = useState<Fired | null>(null);
  const [justRevealed, setJustRevealed] = useState<string | null>(null);
  const [replay, setReplay] = useState<ReplayWindow | null>(null);
  const [comparing, setComparing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    void progressStore.recordVisit(lesson.id);
  }, [lesson.id]);

  // A snapshot's moment is shown as soon as the scene has recorded that far.
  useEffect(() => {
    const moment = restored?.moment;
    if (typeof moment !== "number") return;
    const seekWhenRecorded = () => {
      if (moment >= timeline.getState().length) return false;
      timeline.seek(moment);
      return true;
    };
    if (seekWhenRecorded()) return;
    const stop = timeline.subscribe(() => seekWhenRecorded() && stop());
    return stop;
  }, [restored, timeline]);

  // Missions are checked against the newest state and recorded moment, once saved progress is
  // known (so a mission finished on an earlier visit never fires again).
  useEffect(() => {
    const check = () => {
      const { length, cursor, live } = timeline.getState();
      const done = new Set(progressStore.getState().lessons[lesson.id]?.missions);
      for (const mission of watch(store.getState().state, timeline.at(length - 1), done)) {
        const at = live ? length - 1 : cursor;
        setFired({ mission, window: replayWindow(timeline, at, mission.replay) });
        void progressStore.recordMission(lesson.id, mission.id);
      }
    };
    const checkWhenReady = () => void progressStore.ready.then(check);
    const stopStore = store.subscribe(checkWhenReady);
    const stopTimeline = timeline.subscribe(checkWhenReady);
    return () => {
      stopStore();
      stopTimeline();
    };
  }, [lesson.id, store, timeline, watch]);

  const endReplay = useCallback(() => setReplay(null), []);
  const playReplay = (window: ReplayWindow) => {
    if (startReplay(timeline, window)) setReplay(window);
  };

  const share = async () => {
    const { live, cursor } = timeline.getState();
    const encoded = await encodeSnapshot({
      id: lesson.id,
      ...store.getState(),
      moment: live ? null : cursor,
    });
    const url = new URL(window.location.href);
    url.hash = hashFor(encoded);
    window.history.replaceState(null, "", url);
    await navigator.clipboard?.writeText(url.href).catch(() => undefined);
    setShared(true);
  };

  const isDone = (id: string) => doneMissions.includes(id) || fired?.mission.id === id;
  const nextMission = module.missions.find(({ id }) => !isDone(id));
  const mission =
    module.missions.find(({ id }) => id === focusMission) ??
    fired?.mission ??
    nextMission ??
    module.missions.at(-1);
  const shownFired = fired && fired.mission.id === mission?.id ? fired : null;
  const shownReplay = module.trains ? (shownFired?.window ?? null) : null;
  const nextPrediction = module.predictions.find(({ id }) => !guesses[id]?.revealed);
  const prediction =
    module.predictions.find(({ id }) => id === justRevealed) ??
    nextPrediction ??
    module.predictions.at(-1);
  const frame = timeline.at(length - 1);
  const viewProps = { state, update: store.update, timeline, side: "main" as const };
  const { scene: Scene, controls: Controls, underTheHood: UnderTheHood, captions } = module;
  const compare = module.compare &&
    captions.compare && { alternative: module.compare, ...captions.compare };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl leading-tight md:text-5xl">{lesson.title}</h1>
        <p className="max-w-prose text-lg text-ink-soft">{captions.opening}</p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void share()}
            className="rounded-pill border border-hairline bg-card px-4 py-2 text-sm"
          >
            {platformCaptions.share}
          </button>
          {shared && (
            <p role="status" className="text-sm text-ink-soft">
              {platformCaptions.shared}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-label={platformCaptions.scene}
          data-region="scene"
          className="flex min-h-80 flex-col gap-4 rounded-card border border-hairline bg-card p-4"
        >
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
          {compare && (
            <Toggle label={platformCaptions.compare} checked={comparing} onChange={setComparing} />
          )}
        </section>

        <aside
          aria-label={platformCaptions.dials}
          data-region="dock"
          className="flex flex-col gap-4"
        >
          <PaperCard className="flex flex-wrap justify-center gap-6">
            <Controls {...viewProps} />
          </PaperCard>
          {mission && (
            <MissionPanel
              mission={mission}
              done={isDone(mission.id)}
              justFired={shownFired !== null}
              onReplay={shownReplay ? () => playReplay(shownReplay) : undefined}
              onNext={shownFired && nextMission ? () => setFired(null) : undefined}
            />
          )}
          {prediction && (
            <PredictionCard
              question={prediction.question}
              choices={prediction.choices}
              guess={guesses[prediction.id]}
              answer={prediction.answer(state, frame)}
              onGuess={(choice) => store.guess(prediction.id, choice)}
              onReveal={(answer) => {
                store.reveal(prediction.id, answer);
                setJustRevealed(prediction.id);
                void progressStore.recordPrediction(lesson.id);
              }}
              onNext={
                justRevealed === prediction.id && nextPrediction
                  ? () => setJustRevealed(null)
                  : undefined
              }
            />
          )}
        </aside>
      </div>

      <div data-region="caption" className="flex flex-col items-start gap-3">
        <StoryCaption shown={touched}>{captions.story}</StoryCaption>
        {doneMissions.length > 0 || fired ? <TermTag term={lesson.realTerm} /> : null}
      </div>

      {module.trains && <TimelineBar timeline={timeline} replay={replay} onReplayEnd={endReplay} />}

      {UnderTheHood && (
        <UnderTheHoodDrawer>
          <UnderTheHood {...viewProps} />
        </UnderTheHoodDrawer>
      )}
    </main>
  );
}
