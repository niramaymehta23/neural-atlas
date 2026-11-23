"use client";

import { useCallback, useEffect, useState } from "react";
import { loadWriters } from "@/engine/language/files";
import type { Storyteller } from "@/engine/language/writers";

type Fetched = { status: "loading" | "failed" } | { status: "ready"; teller: Storyteller };

/** The storyteller's files: fetched once the theatre opens, and again when asked after a failure. */
export function useTeller() {
  const [fetched, setFetched] = useState<Fetched>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let left = false;
    loadWriters().then(
      ({ storyteller }) => {
        if (!left) setFetched({ status: "ready", teller: storyteller });
      },
      () => {
        if (!left) setFetched({ status: "failed" });
      },
    );
    return () => {
      left = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFetched({ status: "loading" });
    setAttempt((count) => count + 1);
  }, []);
  return { fetched, retry };
}
