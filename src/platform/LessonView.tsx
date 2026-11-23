"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { platformCaptions } from "./captions";
import { companionStore } from "./companion/companion";
import { fetchedLesson, fetchLesson } from "./lesson-cache";
import type { Lesson, LessonModule, ModuleState } from "./contract";
import { ModuleShell } from "./ModuleShell";
import {
  decodeSnapshot,
  snapshotFromHash,
  type DecodeFailure,
  type Snapshot,
} from "./snapshot/snapshot";

type Loaded = {
  module: LessonModule;
  restored: Snapshot | null;
  /** Why a link in the URL could not be opened, if one could not. */
  linkProblem: DecodeFailure | null;
  focusMission: string | null;
  initialState?: ModuleState;
};

type LessonViewProps = {
  lesson: Lesson;
  /** The lesson to suggest once this one's missions are done. */
  nextIdea?: { id: string; title: string } | null;
  /** Extra dials for a lesson that trains. */
  trainingExtras?: ComponentProps<typeof ModuleShell>["trainingExtras"];
};

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-card px-4 py-2 text-sm text-accent-ink";

/** The URL without a snapshot in its hash, keeping `mission=`. */
function dropSnapshotFromUrl() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  params.delete("s");
  const rest = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${rest ? `#${rest}` : ""}`,
  );
}

let companionHydrated = false;
void companionStore.ready.then(() => (companionHydrated = true));

/**
 * The lesson ready to show at once, when its code has already arrived and nothing needs waiting
 * for (no link to decode, no companion still loading). Never on the server.
 */
function loadedAlready(lesson: Lesson): Loaded | null {
  if (typeof window === "undefined") return null;
  const definition = fetchedLesson(lesson.id);
  const hash = window.location.hash;
  if (!definition || snapshotFromHash(hash)) return null;
  if (definition.initialFrom && !companionHydrated) return null;
  return {
    module: definition,
    restored: null,
    linkProblem: null,
    focusMission: new URLSearchParams(hash.slice(1)).get("mission"),
    initialState: definition.initialFrom?.(companionStore.getState(), definition.initialState),
  };
}

async function loadLesson(lesson: Lesson, hash: string): Promise<Loaded> {
  const definition = await fetchLesson(lesson);
  const encoded = snapshotFromHash(hash);
  const decoded = encoded ? await decodeSnapshot(encoded, lesson.id, definition) : null;
  const restored = decoded?.ok ? decoded.snapshot : null;
  let initialState: ModuleState | undefined;
  if (!restored && definition.initialFrom) {
    await companionStore.ready;
    initialState = definition.initialFrom(companionStore.getState(), definition.initialState);
  }
  return {
    module: definition,
    restored,
    linkProblem: decoded && !decoded.ok ? decoded.reason : null,
    focusMission: new URLSearchParams(hash.slice(1)).get("mission"),
    initialState,
  };
}

/**
 * Loads a built lesson, restores any snapshot link in the URL (or starts from the learner's own
 * network), then hands it to the shell. A failed load offers to try again; a link that cannot be
 * opened says why.
 */
export function LessonView({ lesson, nextIdea, trainingExtras }: LessonViewProps) {
  const [attempt, setAttempt] = useState(0);
  // A lesson fetched early opens at once; otherwise it loads after the first paint.
  const [opened] = useState(() => loadedAlready(lesson));
  const [loaded, setLoaded] = useState<Loaded | "failed" | null>(opened);

  useEffect(() => {
    if (attempt === 0 && opened && opened.module === fetchedLesson(lesson.id)) return;
    let current = true;
    loadLesson(lesson, window.location.hash).then(
      (result) => current && setLoaded(result),
      () => current && setLoaded("failed"),
    );
    return () => {
      current = false;
    };
  }, [lesson, attempt, opened]);

  const reload = () => {
    setLoaded(null);
    setAttempt((count) => count + 1);
  };

  if (loaded === "failed") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p role="alert">{platformCaptions.loadFailed}</p>
        <button type="button" onClick={reload} className={BUTTON}>
          {platformCaptions.problem.retry}
        </button>
      </div>
    );
  }
  if (!loaded) {
    return (
      <p role="status" className="mx-auto max-w-xl px-4 py-24 text-center text-ink-soft">
        {platformCaptions.loading}
      </p>
    );
  }
  const { linkProblem, ...shell } = loaded;
  return (
    <>
      {linkProblem && (
        <p
          role="status"
          data-link-problem={linkProblem}
          className="mx-auto mt-4 w-full max-w-6xl px-4 text-sm text-ink-soft md:px-6"
        >
          {platformCaptions.link[linkProblem]}
        </p>
      )}
      <ModuleShell
        key={attempt}
        lesson={lesson}
        nextIdea={nextIdea}
        trainingExtras={trainingExtras}
        onStartOwn={() => {
          dropSnapshotFromUrl();
          reload();
        }}
        {...shell}
      />
    </>
  );
}
