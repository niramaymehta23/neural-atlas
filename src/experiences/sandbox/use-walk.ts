"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/design/motion";

const STEP_MS = 160;

/**
 * Where the piece stands: it walks the latest try square by square, then takes up the next one
 * that has come in. Under reduced motion it stands where the latest try ended.
 */
export function useWalk(walk: readonly number[] | null, start: number): number {
  const reduced = useReducedMotion();
  const [at, setAt] = useState(start);
  const latest = useRef(walk);
  const waiting = useRef(false);
  useEffect(() => {
    latest.current = walk;
    waiting.current = walk !== null;
  }, [walk]);

  const going = walk !== null && walk.length > 1 && !reduced;
  useEffect(() => {
    if (!going) return;
    let path: readonly number[] = [];
    let step = 0;
    const timer = setInterval(() => {
      if (step >= path.length) {
        if (!waiting.current) return;
        waiting.current = false;
        path = latest.current ?? [];
        step = 0;
      }
      const square = path[step];
      step += 1;
      if (square !== undefined) setAt(square);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [going]);

  return going ? at : (walk?.at(-1) ?? start);
}
