"use client";

import { useEffect, useRef, useState } from "react";

/** Work done between breaths, so the page keeps drawing while a map is worked out. */
const SLICE_MS = 6;

/**
 * Runs `count` pieces of work (`each(index)`) in short slices with a breath between them, and
 * reports how many are done. Starts again whenever `key` changes (null waits); the newest `each`
 * is the one that runs.
 */
export function useSliced(key: string | null, count: number, each: (index: number) => void) {
  const latest = useRef(each);
  const [done, setDone] = useState<{ key: string | null; count: number }>({ key: null, count: 0 });
  useEffect(() => {
    latest.current = each;
  });
  useEffect(() => {
    if (key === null) return;
    let next = 0;
    let timer: ReturnType<typeof setTimeout>;
    const slice = () => {
      const started = performance.now();
      while (next < count && performance.now() - started < SLICE_MS) {
        latest.current(next);
        next += 1;
      }
      setDone({ key, count: next });
      if (next < count) timer = setTimeout(slice, 0);
    };
    timer = setTimeout(slice, 0);
    return () => clearTimeout(timer);
  }, [key, count]);
  return done.key === key ? done.count : 0;
}
