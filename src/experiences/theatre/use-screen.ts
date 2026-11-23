"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Controls fade after this long without a touch, a move or a key. */
export const IDLE_MS = 4_000;

function subscribeToFull(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** Filling the screen, where the browser can. Elsewhere the page already fills its window. */
export function useFullScreen() {
  const able = useSyncExternalStore(
    () => () => {},
    () => document.fullscreenEnabled === true,
    () => false,
  );
  const full = useSyncExternalStore(
    subscribeToFull,
    () => document.fullscreenElement != null,
    () => false,
  );
  const [refused, setRefused] = useState(false);
  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      // The whole page, so an idea card can open over the show.
      else await document.documentElement.requestFullscreen();
      setRefused(false);
    } catch {
      setRefused(true);
    }
  }, []);
  return { able, full, refused, toggle };
}

/** Keeps the screen from sleeping while something plays. Not every browser can, and that is fine. */
export function useAwake(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let left = false;
    let lock: WakeLockSentinel | null = null;
    const hold = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const held = await navigator.wakeLock.request("screen");
        if (left) void held.release().catch(() => {});
        else lock = held;
      } catch {
        // Refused (a low battery, say): the screen may dim, and the show goes on.
      }
    };
    void hold();
    document.addEventListener("visibilitychange", hold);
    return () => {
      left = true;
      document.removeEventListener("visibilitychange", hold);
      void lock?.release().catch(() => {});
    };
  }, [on]);
}

/** True once nobody has moved, tapped or pressed a key for a while (never while `keep`). */
export function useIdle(keep: boolean): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), IDLE_MS);
    };
    const signs = ["pointermove", "pointerdown", "keydown", "focusin"] as const;
    for (const sign of signs) window.addEventListener(sign, wake);
    timer.current = setTimeout(() => setIdle(true), IDLE_MS);
    return () => {
      clearTimeout(timer.current);
      for (const sign of signs) window.removeEventListener(sign, wake);
    };
  }, []);
  return idle && !keep;
}
