"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/design/motion";

const STEP_MS = 160;
const NOWHERE: readonly number[] = [];

/**
 * Where the piece stands: it walks the latest try square by square, then takes up the next one
 * that has come in, and stands still when there is none. Under reduced motion it stands where
 * the latest try ended.
 */
export function useWalk(walk: readonly number[] | null, start: number): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState({ path: NOWHERE, step: 0 });
  const latest = useRef(walk);
  useEffect(() => {
    latest.current = walk;
  });

  const going = walk !== null && walk.length > 1 && !reduced;
  const ended = shown.step >= shown.path.length - 1;
  // A try that comes in while another is being walked waits its turn, and never delays a step.
  const moving = going && (!ended || shown.path !== walk);
  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(
      () =>
        setShown(({ path, step }) =>
          step < path.length - 1
            ? { path, step: step + 1 }
            : { path: latest.current ?? NOWHERE, step: 0 },
        ),
      STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [moving, shown]);

  return going ? (shown.path[shown.step] ?? start) : (walk?.at(-1) ?? start);
}
