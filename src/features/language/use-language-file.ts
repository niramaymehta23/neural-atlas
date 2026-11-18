"use client";

import { useCallback, useEffect, useState } from "react";

export type Loaded<T> =
  { status: "loading" } | { status: "failed"; retry: () => void } | { status: "ready"; value: T };

const LOADING = { status: "loading" } as const;

/**
 * One of World 5's language files (a loader from `engine/language/files`), fetched on first use;
 * "failed" offers Try again. The answer stays the same object until something changes, so scenes
 * can depend on it. `load` must be a stable function (the loaders are module-level).
 */
export function useLanguageFile<T>(load: () => Promise<T>): Loaded<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ attempt: number; loaded: Loaded<T> } | null>(null);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let current = true;
    load().then(
      (value) => current && setSettled({ attempt, loaded: { status: "ready", value } }),
      () => current && setSettled({ attempt, loaded: { status: "failed", retry } }),
    );
    return () => {
      current = false;
    };
  }, [load, attempt, retry]);

  return settled && settled.attempt === attempt ? settled.loaded : LOADING;
}

/** The value of two loads once both are ready; otherwise the first that is not. */
export function both<A, B>(a: Loaded<A>, b: Loaded<B>): Loaded<[A, B]> {
  if (a.status === "failed") return a;
  if (b.status === "failed") return b;
  if (a.status === "ready" && b.status === "ready")
    return { status: "ready", value: [a.value, b.value] };
  return LOADING;
}
