"use client";

import { useEffect, useState } from "react";
import { platformCaptions } from "./captions";
import type { Lesson, LessonModule } from "./contract";
import { ModuleShell } from "./ModuleShell";
import { decodeSnapshot, snapshotFromHash, type Snapshot } from "./snapshot/snapshot";

type Loaded = { module: LessonModule; restored: Snapshot | null; focusMission: string | null };

/** Loads a built lesson, restores any snapshot link in the URL, then hands it to the shell. */
export function LessonView({ lesson }: { lesson: Lesson }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let current = true;
    const hash = window.location.hash;
    void lesson.load?.().then(async (module) => {
      const encoded = snapshotFromHash(hash);
      const restored = encoded
        ? await decodeSnapshot(encoded, lesson.id, module.initialState)
        : null;
      const focusMission = new URLSearchParams(hash.slice(1)).get("mission");
      if (current) setLoaded({ module, restored, focusMission });
    });
    return () => {
      current = false;
    };
  }, [lesson]);

  if (!loaded) {
    return (
      <p role="status" className="mx-auto max-w-xl px-4 py-24 text-center text-ink-soft">
        {platformCaptions.loading}
      </p>
    );
  }
  return <ModuleShell lesson={lesson} {...loaded} />;
}
