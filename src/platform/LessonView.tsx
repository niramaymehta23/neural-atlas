"use client";

import { useEffect, useState } from "react";
import { platformCaptions } from "./captions";
import { companionStore } from "./companion/companion";
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

async function loadLesson(lesson: Lesson, hash: string): Promise<Loaded> {
  if (!lesson.load) throw new Error(`${lesson.id} is not built`);
  const definition = await lesson.load();
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
export function LessonView({ lesson, nextIdea }: LessonViewProps) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | "failed" | null>(null);

  useEffect(() => {
    let current = true;
    loadLesson(lesson, window.location.hash).then(
      (result) => current && setLoaded(result),
      () => current && setLoaded("failed"),
    );
    return () => {
      current = false;
    };
  }, [lesson, attempt]);

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
        onStartOwn={() => {
          dropSnapshotFromUrl();
          reload();
        }}
        {...shell}
      />
    </>
  );
}
